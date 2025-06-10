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

interface Store {
  id: string;
  name: string;
  api_key: string | undefined;
  conversion_metric_id: string;
}

const stores: Store[] = [
  {
    id: "1",
    name: "DRIP EZ",
    // @ts-ignore
    api_key: Deno.env.get("DRIP_EZ_KLAVIYO_API_KEY"),
    conversion_metric_id: "WsZZFn",
  },
];

interface KlaviyoCampaignStatsResult {
  groupings: {
    campaign_id?: string;
  };
  statistics: Record<string, number | string | null>;
}

interface KlaviyoCampaignMessage {
  type: string;
  id: string;
  attributes: {
    definition?: { 
      channel?: string;
      content?: {
        subject?: string;
        from_email?: string;
        preview_text?: string;
      };
    };
  };
}

interface KlaviyoCampaignDetails {
  data: {
    id: string;
    attributes: {
      name?: string;
      send_time?: string;
    };
    relationships?: {
      "campaign-messages"?: {
        data?: { type: string; id: string }[];
      };
    };
  };
  included?: KlaviyoCampaignMessage[];
}

interface KlaviyoTemplateAttributes {
  name: string;
  editor_type: string;
  html: string;
  text: string;
  amp: string;
  created: string;
  updated: string;
}

interface KlaviyoTemplateData {
  type: "template";
  id: string;
  attributes: KlaviyoTemplateAttributes;
  links: {
    self: string;
  };
}

interface KlaviyoTemplateResponse {
  data: KlaviyoTemplateData;
}

const getCampaignData = async (store: Store, supabase: SupabaseClient) => {
  if (!store.api_key) {
    console.error(`API key missing for store ${store.name}. Skipping.`);
    return;
  }

  const reportOptions = {
    method: "POST",
    headers: {
      accept: "application/vnd.api+json",
      revision: "2025-04-15",
      "content-type": "application/vnd.api+json",
      Authorization: `Klaviyo-API-Key ${store.api_key}`,
    },
    body: JSON.stringify({
      data: {
        type: "campaign-values-report",
        attributes: {
          timeframe: {
            key: "last_30_days",
          },
          conversion_metric_id: store.conversion_metric_id,
          statistics: [
            "average_order_value",
            "bounce_rate",
            "bounced",
            "bounced_or_failed",
            "bounced_or_failed_rate",
            "click_rate",
            "click_to_open_rate",
            "clicks",
            "clicks_unique",
            "conversion_rate",
            "conversion_uniques",
            "conversion_value",
            "conversions",
            "delivered",
            "delivery_rate",
            "open_rate",
            "opens",
            "opens_unique",
            "recipients",
            "revenue_per_recipient",
            "spam_complaint_rate",
            "spam_complaints",
            "unsubscribe_rate",
            "unsubscribe_uniques",
            "unsubscribes",
          ],
        },
      },
    }),
  };

  try {
    const reportResponse = await fetch(
      `https://a.klaviyo.com/api/campaign-values-reports`,
      reportOptions
    );

    if (!reportResponse.ok) {
      console.error(
        `Error fetching Klaviyo campaign report for store ${store.name}: ${reportResponse.status} ${reportResponse.statusText}`,
        await reportResponse.text()
      );
      return;
    }

    const reportData = await reportResponse.json();

    const campaignStatsResults: KlaviyoCampaignStatsResult[] =
      reportData?.data?.attributes?.results;

    if (campaignStatsResults && campaignStatsResults.length > 0) {
      // Process campaign details sequentially to strictly control rate limits
      const campaignDetailsResults = [];

      // Get all campaign IDs that need details
      const campaignIds = campaignStatsResults
        .filter((result) => result.groupings?.campaign_id)
        .map((result) => result.groupings.campaign_id!);

      console.log(`Processing ${campaignIds.length} campaigns sequentially...`);

      // Function to fetch details for one campaign with retry logic
      const fetchCampaignDetailsWithRetry = async (
        campaignId: string,
        storeApiKey: string
      ) => {
        const detailOptions = {
          method: "GET",
          headers: {
            accept: "application/vnd.api+json",
            revision: "2025-04-15",
            Authorization: `Klaviyo-API-Key ${storeApiKey}`,
          },
        };
        const detailUrl = `https://a.klaviyo.com/api/campaigns/${campaignId}?include=campaign-messages`;
        let attempts = 0;
        const maxRetries = 3;
        let delay = 2000; // Initial delay 2s

        while (attempts < maxRetries) {
          try {
            const detailResponse = await fetch(detailUrl, detailOptions);

            if (detailResponse.ok) {
              const details = await detailResponse.json();
              return { campaign_id: campaignId, details };
            }

            if (detailResponse.status === 429 && attempts < maxRetries - 1) {
              console.log(
                `Rate limited (429) on campaign ${campaignId}, attempt ${
                  attempts + 1
                }. Waiting ${delay / 1000}s before retry...`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay *= 2; // Exponential backoff
              attempts++;
            } else {
              // Handle other errors or final failed retry
              console.error(
                `Error fetching details for campaign ${campaignId}: ${
                  detailResponse.status
                } ${detailResponse.statusText} (Attempt ${attempts + 1})`,
                await detailResponse.text()
              );
              return { campaign_id: campaignId, details: null }; // Failed after retries or non-429 error
            }
          } catch (fetchError) {
            console.error(
              `Network error fetching details for campaign ${campaignId} (Attempt ${
                attempts + 1
              }):`,
              fetchError
            );
            // Decide if network errors should retry - currently not retrying network errors
            return { campaign_id: campaignId, details: null };
          }
        }
        // Should not be reached if maxRetries > 0, but safety return
        return { campaign_id: campaignId, details: null };
      };

      // Process IDs sequentially
      for (const campaignId of campaignIds) {
        console.log(`Fetching details for campaign ${campaignId}...`);
        const result = await fetchCampaignDetailsWithRetry(
          campaignId,
          store.api_key!
        ); // Pass API key
        campaignDetailsResults.push(result);

        // Add delay after each request completes to respect steady limit (150/m -> ~400ms per req)
        // Adjust based on typical API response time. 150ms delay + ~250ms API time = 400ms cycle.
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const detailsMap = new Map(
        campaignDetailsResults.map((item) => [item.campaign_id, item.details])
      );

      // Function to fetch template for a campaign message with simplified retry
      const fetchCampaignTemplateWithRetry = async (
        messageId: string,
        storeApiKey: string
      ): Promise<KlaviyoTemplateResponse | null> => {
        const templateUrl = `https://a.klaviyo.com/api/campaign-messages/${messageId}/template`;
        const templateOptions = {
          method: "GET",
          headers: {
            accept: "application/vnd.api+json",
            revision: "2025-04-15", // Ensure this revision is current for the template endpoint
            Authorization: `Klaviyo-API-Key ${storeApiKey}`,
          },
        };
        let attempts = 0;
        const maxRetries = 2; // Simpler retry for templates
        let delay = 1000;

        while (attempts < maxRetries) {
          try {
            const response = await fetch(templateUrl, templateOptions);
            if (response.ok) {
              return (await response.json()) as KlaviyoTemplateResponse;
            }
            if (response.status === 429 && attempts < maxRetries - 1) {
              console.log(
                `Rate limited (429) on template ${messageId}, attempt ${
                  attempts + 1
                }. Waiting ${delay / 1000}s before retry...`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay *= 2;
              attempts++;
            } else {
              console.error(
                `Error fetching template for message ${messageId}: ${
                  response.status
                } ${response.statusText} (Attempt ${attempts + 1})`,
                await response.text()
              );
              return null;
            }
          } catch (fetchError) {
            console.error(
              `Network error fetching template for message ${messageId} (Attempt ${
                attempts + 1
              }):`,
              fetchError
            );
            // Not retrying network errors for templates in this simplified version
            return null;
          }
        }
        return null;
      };

      // Convert Promise.all to a sequential loop to respect rate limits for template fetching
      const campaignsToInsert = [];
      for (const result of campaignStatsResults) {
        const campaignId = result.groupings?.campaign_id;
        const detailsData: KlaviyoCampaignDetails | null = campaignId
          ? detailsMap.get(campaignId)
          : null;

        let subject: string | null = null;
        let channel: string | null = null;
        let preview_text: string | null = null;
        let from_email: string | null = null;

        if (
          detailsData?.included &&
          detailsData.data.relationships?.["campaign-messages"]?.data
        ) {
          const messageRelationshipData =
            detailsData.data.relationships["campaign-messages"].data[0];
          if (messageRelationshipData?.id) {
            const messageId = messageRelationshipData.id;
            const message = detailsData.included.find(
              (inc: KlaviyoCampaignMessage) =>
                inc.type === "campaign-message" && inc.id === messageId
            );
            subject = message?.attributes?.definition?.content?.subject ?? null;
            from_email =
              message?.attributes?.definition?.content?.from_email ?? null;
            preview_text =
              message?.attributes?.definition?.content?.preview_text ?? null;
            channel = message?.attributes?.definition?.channel ?? null;
          }
        }

        campaignsToInsert.push({
          store_name: store.name,
          campaign_id: campaignId ?? null,
          ...result.statistics,
          name: detailsData?.data.attributes.name ?? null,
          sent_time: detailsData?.data.attributes.send_time ?? null,
          subject: subject,
          from_email: from_email,
          channel: channel,
          campaign_url: campaignId
            ? `https://klaviyo.com/campaign/${campaignId}/web-view`
            : null,
          preview_text: preview_text,
        });
      }

      if (campaignsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("klaviyo_campaigns")
          .upsert(campaignsToInsert, {
            onConflict: "campaign_id",
            // Specify which fields to update, preserving image-related fields
            merge: [
              "store_name",
              "name",
              "sent_time",
              "subject",
              "from_email",
              "channel",
              "campaign_url",
              "preview_text",
              // All statistics fields
              "average_order_value",
              "bounce_rate",
              "bounced",
              "bounced_or_failed",
              "bounced_or_failed_rate",
              "click_rate",
              "click_to_open_rate",
              "clicks",
              "clicks_unique",
              "conversion_rate",
              "conversion_uniques",
              "conversion_value",
              "conversions",
              "delivered",
              "delivery_rate",
              "open_rate",
              "opens",
              "opens_unique",
              "recipients",
              "revenue_per_recipient",
              "spam_complaint_rate",
              "spam_complaints",
              "unsubscribe_rate",
              "unsubscribe_uniques",
              "unsubscribes",
            ],
          });

        if (insertError) {
          console.error(`Error inserting into klaviyo_campaigns:`, insertError);
        } else {
          console.log(
            `Successfully inserted ${campaignsToInsert.length} campaigns into klaviyo_campaigns.`
          );

          // Now process images for campaigns that need them
          for (const campaign of campaignsToInsert) {
            if (!campaign.campaign_id || campaign.channel === "sms") continue;

            // Check if we already have an image for this campaign
            const { data: existingCampaign } = await supabase
              .from("klaviyo_campaigns")
              .select("campaign_image_url, image_id")
              .eq("campaign_id", campaign.campaign_id)
              .single();

            if (
              existingCampaign?.campaign_image_url ||
              existingCampaign?.image_id
            ) {
              console.log(
                `Campaign ${campaign.campaign_id} already has image processing in progress or completed. Skipping.`
              );
              continue;
            }

            // Find the message ID from the details we already have
            const detailsData = detailsMap.get(campaign.campaign_id);
            const messageId =
              detailsData?.data.relationships?.["campaign-messages"]?.data[0]
                ?.id;

            if (!messageId) {
              console.log(
                `No message ID found for campaign ${campaign.campaign_id}. Skipping image processing.`
              );
              continue;
            }

            // Fetch template and process image
            if (store.api_key) {
              console.log(
                `Processing image for campaign ${campaign.campaign_id}, message ${messageId}...`
              );
              const templateResponse = await fetchCampaignTemplateWithRetry(
                messageId,
                store.api_key
              );

              if (templateResponse?.data?.attributes?.html) {
                const escapedHTML = templateResponse.data.attributes.html;
                const unescapedHTML = escapedHTML
                  .replace(/\n/g, "\n")
                  .replace(/\"/g, '"');

                // Initiate Convertio conversion
                const convertioApiKey = Deno.env.get("CONVERTIO_API_KEY");
                const callbackBaseUrl = Deno.env.get("PUBLIC_FUNCTIONS_URL");

                if (convertioApiKey && callbackBaseUrl) {
                  try {
                    console.log(
                      `Initiating Convertio job for campaign ${campaign.campaign_id}...`
                    );
                    const convertioPayload = {
                      apikey: convertioApiKey,
                      input: "raw",
                      filename: `c_${campaign.campaign_id}_${messageId}.html`,
                      file: unescapedHTML,
                      outputformat: "png",
                      options: {
                        callback_url: `${callbackBaseUrl}/convertio-callback`,
                      },
                    };

                    const startConversionResponse = await fetch(
                      "https://api.convertio.co/convert",
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(convertioPayload),
                      }
                    );

                    const convertioResult =
                      await startConversionResponse.json();

                    if (
                      startConversionResponse.ok &&
                      convertioResult.status === "ok" &&
                      convertioResult.data?.id
                    ) {
                      console.log(
                        `Convertio job started. ID: ${convertioResult.data.id} for campaign ${campaign.campaign_id}`
                      );

                      // Store the Convertio ID
                      await supabase
                        .from("klaviyo_campaigns")
                        .update({ image_id: convertioResult.data.id })
                        .eq("campaign_id", campaign.campaign_id);
                    } else {
                      console.error(
                        `Error initiating Convertio job for campaign ${campaign.campaign_id}:`,
                        convertioResult.error ||
                          `Convertio API error: ${startConversionResponse.status}`
                      );
                    }
                  } catch (initiationError) {
                    console.error(
                      `Exception during Convertio job initiation for campaign ${campaign.campaign_id}:`,
                      initiationError
                    );
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (fetchError) {
    console.error(
      `Network error fetching campaign data for store ${store.name}:`,
      fetchError
    );
  }
};
// @ts-ignore
Deno.serve(async (req: Request) => {
  // @ts-ignore
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  // @ts-ignore
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase URL or Anon Key environment variables.");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!authorization) {
    console.error("Authorization header missing.");
    return new Response(JSON.stringify({ error: "Authorization required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });

  for (const store of stores) {
    await getCampaignData(store, supabase);
  }

  console.log("Klaviyo data fetch process completed for all stores.");
  return new Response(
    JSON.stringify({ message: "Klaviyo data fetch process completed." }),
    { headers: { "Content-Type": "application/json" }, status: 200 }
  );
});
