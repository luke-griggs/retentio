// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
  SupabaseClient,
  // @ts-ignore
} from "jsr:@supabase/supabase-js@2";

// Declare Deno types for Edge Runtime
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

// Note: CONVERTIO_API_KEY might not be strictly needed here if Convertio
// allows fetching status by ID without it once a callback is made.
// However, including it for fetching status is safer if their API requires it.
// const CONVERTIO_API_KEY = Deno.env.get("CONVERTIO_API_KEY");

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // Added service role key for storage access
  const convertioApiKey = Deno.env.get("CONVERTIO_API_KEY");

  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    !convertioApiKey ||
    !supabaseServiceKey
  ) {
    console.error("Missing required environment variables");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Create two clients - one with anon key for public operations
  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  // And one with service role key that can bypass RLS
  const supabaseAdmin: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceKey
  );

  const { searchParams } = new URL(req.url);
  const imageId = searchParams.get("id"); // This is the Convertio ID

  console.log(`Convertio callback received for image_id: ${imageId}`);

  if (!imageId) {
    console.error("Convertio callback: Missing image ID");
    return new Response(JSON.stringify({ error: "Bad request: missing id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // First get the campaign details to check if it's an SMS campaign
    const { data: campaignData, error: campaignError } = await supabase
      .from("klaviyo_campaigns")
      .select("channel")
      .eq("image_id", imageId)
      .single();

    if (campaignError) {
      console.error("Error fetching campaign data:", campaignError);
      return new Response(
        JSON.stringify({ error: "Error fetching campaign data" }),
        { status: 500 }
      );
    }

    // Skip processing for SMS campaigns
    if (campaignData.channel === "sms") {
      return new Response(JSON.stringify({ message: "Skipped SMS campaign" }), {
        status: 200,
      });
    }

    // Download the converted file properly according to Convertio API docs
    const downloadUrl = `https://api.convertio.co/convert/${imageId}/dl`;
    console.log(`Fetching converted file from ${downloadUrl}`);

    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${convertioApiKey}`,
      },
    });

    if (!downloadResponse.ok) {
      console.error(
        `Failed to download from Convertio: ${downloadResponse.status}`
      );
      const errorText = await downloadResponse.text();
      console.error(`Error response: ${errorText}`);
      throw new Error(
        `Failed to download from Convertio: ${downloadResponse.status}`
      );
    }

    // Parse the JSON response
    const responseData = await downloadResponse.json();
    console.log(
      `Received response: ${JSON.stringify(responseData, null, 2).substring(
        0,
        200
      )}...`
    );

    if (
      responseData.status !== "ok" ||
      !responseData.data ||
      !responseData.data.content
    ) {
      console.error("Invalid response format from Convertio");
      throw new Error("Invalid response format from Convertio");
    }

    // Decode the base64 content
    const base64Content = responseData.data.content;
    const binaryContent = Uint8Array.from(atob(base64Content), (c) =>
      c.charCodeAt(0)
    );
    const imageBuffer = binaryContent.buffer;

    console.log(`Decoded file size: ${imageBuffer.byteLength} bytes`);

    if (imageBuffer.byteLength === 0) {
      throw new Error("Downloaded empty file from Convertio");
    }

    const fileName = `campaign_image_${imageId}.png`;

    // Upload to Supabase Storage using admin client to bypass RLS
    console.log(
      `Uploading file to storage bucket: campaign-images/drip-ez/${fileName}`
    );
    const { error: uploadError } = await supabaseAdmin.storage
      .from("campaign-images")
      .upload(`drip-ez/${fileName}`, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error(`Storage upload error: ${JSON.stringify(uploadError)}`);
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Get the public URL for the uploaded image
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from("campaign-images")
      .getPublicUrl(`drip-ez/${fileName}`);

    console.log(`Generated public URL: ${publicUrl}`);

    // Update the campaign record with just the image URL - also using admin client
    await supabaseAdmin
      .from("klaviyo_campaigns")
      .update({
        campaign_image_url: publicUrl,
      })
      .eq("image_id", imageId);

    console.log(`Successfully processed image ${imageId}`);
    return new Response(
      JSON.stringify({
        message: "Success",
        publicUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing Convertio callback:", error);

    return new Response(
      JSON.stringify({ error: "Internal server error processing callback" }),
      { status: 500 }
    );
  }
});

/*
To deploy:
supabase functions deploy convertio-callback --no-verify-jwt (if it doesn't need user context from an API Gateway perspective)

Ensure `conversion_jobs` table exists:
CREATE TABLE public.conversion_jobs (
  id TEXT PRIMARY KEY, -- Convertio's conversion ID
  campaign_id TEXT,    -- Your internal campaign ID, set by getKlaviyoCampaigns
  message_id TEXT,     -- Your internal message ID, set by getKlaviyoCampaigns
  status TEXT,         -- e.g., started, finished, failed
  image_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversion_jobs_updated_at
BEFORE UPDATE ON public.conversion_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

Consider RLS policies for the conversion_jobs table.
The callback function will likely need broad insert/update access, potentially using a service_role key
if anon key is restricted.

CREATE TABLE public.klaviyo_campaigns (
  -- ... your existing columns ...
  campaign_id TEXT PRIMARY KEY,
  store_name TEXT,
  name TEXT,
  sent_time TIMESTAMPTZ,
  subject TEXT,
  from_email TEXT,
  channel TEXT,
  campaign_url TEXT,
  preview_text TEXT,
  average_order_value NUMERIC,
  bounce_rate NUMERIC,
  bounced INTEGER,
  bounced_or_failed INTEGER,
  bounced_or_failed_rate NUMERIC,
  click_rate NUMERIC,
  click_to_open_rate NUMERIC,
  clicks INTEGER,
  clicks_unique INTEGER,
  conversion_rate NUMERIC,
  conversion_uniques INTEGER,
  conversion_value NUMERIC,
  conversions INTEGER,
  delivered INTEGER,
  delivery_rate NUMERIC,
  open_rate NUMERIC,
  opens INTEGER,
  opens_unique INTEGER,
  recipients INTEGER,
  revenue_per_recipient NUMERIC,
  spam_complaint_rate NUMERIC,
  spam_complaints INTEGER,
  unsubscribe_rate NUMERIC,
  unsubscribe_uniques INTEGER,
  unsubscribes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- New columns for Convertio callback flow
  campaign_image_url TEXT NULLABLE,
  pending_convertio_id TEXT NULLABLE,
  image_conversion_status TEXT NULLABLE, -- e.g., pending, completed, failed, initiation_failed
  image_conversion_error TEXT NULLABLE   -- Store error messages from Convertio or process
);

-- Optional: Trigger to update updated_at timestamp
-- (If you don't have this already for klaviyo_campaigns)
CREATE OR REPLACE FUNCTION public.update_klaviyo_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_klaviyo_campaigns_updated_at
BEFORE UPDATE ON public.klaviyo_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_klaviyo_campaigns_updated_at();
*/
