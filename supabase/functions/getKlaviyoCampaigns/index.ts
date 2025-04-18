import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
  SupabaseClient,
  // @ts-ignore
} from "jsr:@supabase/supabase-js@2";

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
      content?: {
        subject?: string;
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
            key: "last_12_months",
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
            "failed",
            "failed_rate",
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

      const campaignsToInsert = campaignStatsResults.map((result) => {
        const campaignId = result.groupings?.campaign_id;
        const detailsData = campaignId ? detailsMap.get(campaignId) : null;

        let subject: string | null = null;
        if (
          detailsData?.included &&
          detailsData.data.relationships?.["campaign-messages"]?.data
        ) {
          const messageId =
            detailsData.data.relationships["campaign-messages"].data[0]?.id;
          if (messageId) {
            const message = detailsData.included.find(
              (inc: KlaviyoCampaignMessage) =>
                inc.type === "campaign-message" && inc.id === messageId
            );
            subject = message?.attributes?.definition?.content?.subject ?? null;
          }
        }

        return {
          store_name: store.name,
          campaign_id: campaignId ?? null,
          ...result.statistics,
          name: detailsData?.data.attributes.name ?? null,
          sent_time: detailsData?.data.attributes.send_time ?? null,
          subject: subject,
        };
      });

      if (campaignsToInsert.length > 0) {
        console.log(
          `--- Attempting to insert ${campaignsToInsert.length} enriched records for store ${store.name} ---`
        );

        const { error, data } = await supabase
          .from("klaviyo_campaigns")
          .insert(campaignsToInsert)
          .select();

        if (error) {
          console.error(
            `Error inserting enriched data into Supabase for store ${store.name}:`,
            error
          );
          console.error("Error details:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          console.error(
            "Data attempted:",
            JSON.stringify(campaignsToInsert[0], null, 2)
          );
        } else {
          console.log(
            `Successfully inserted ${
              data?.length ?? campaignsToInsert.length
            } enriched campaign records for store ${store.name}`
          );
        }
      } else {
        console.log(
          `No campaign results found to process for store ${store.name}`
        );
      }
    } else {
      console.log(
        `No campaign statistic results found for store ${store.name}`
      );
    }
  } catch (error) {
    console.error(
      `An unexpected error occurred processing store ${store.name}:`,
      error
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
