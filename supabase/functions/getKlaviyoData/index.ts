import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface Store {
  id: string;
  name: string;
  api_key: string;
  conversion_metric_id: string;
}

const stores: Store[] = [
  {
    id: "1",
    name: "DRIP EZ",
    api_key: Deno.env.get("DRIP_EZ_KLAVIYO_API_KEY"),
    conversion_metric_id: "WsZZFn",
  },
];

const getCampaignData = async (store: Store, supabase: any) => {
  const options = {
    method: "POST",
    headers: {
      accept: "application/vnd.api+json",
      revision: "2025-01-15",
      "content-type": "application/vnd.api+json",
      Authorization: `Klaviyo-API-Key ${store.api_key}`,
    },
    body: JSON.stringify({
      data: {
        type: "campaign-values-report",
        attributes: {
          timeframe: {
            key: "last_month",
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
    const response = await fetch(
      `https://a.klaviyo.com/api/campaign-values-reports`,
      options
    );

    if (!response.ok) {
      console.error(
        `Error fetching Klaviyo data for store ${store.name}: ${response.status} ${response.statusText}`
      );
      return;
    }

    const responseData = await response.json();

    if (
      responseData &&
      responseData.data &&
      responseData.data.attributes &&
      responseData.data.attributes.results
    ) {
      const campaignsToInsert = responseData.data.attributes.results.map(
        (result: any) => ({
          store_name: store.name,
          campaign_id: result.groupings?.campaign_id,
          ...result.statistics,
        })
      );

      if (campaignsToInsert.length > 0) {
        // Log the exact data being sent to Supabase
        console.log(
          "--- Attempting to insert the following data into Supabase ---"
        );
        console.log(JSON.stringify(campaignsToInsert, null, 2));
        console.log("-----------------------------------------------------");

        const { error, data } = await supabase.from("klaviyo_campaigns").insert(campaignsToInsert);

        if (error) {
          console.error(
            `Error inserting data into Supabase for store ${store.name}:`,
            error
          );
          // Log more details about the error
          console.error("Error details:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
        } else {
          console.log(
            `Successfully inserted ${campaignsToInsert.length} campaign records for store ${store.name}`
          );
          // Log the successfully inserted data
          console.log("Inserted data:", data);
        }
      } else {
        console.log(`No campaign results found for store ${store.name}`);
      }
    } else {
      console.warn(
        `Unexpected response structure for store ${store.name}:`,
        responseData
      );
    }
  } catch (error) {
    console.error(`An error occurred processing store ${store.name}:`, error);
  }
};

    Deno.serve(async (req: Request) => {
    const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: req.headers.get("Authorization")! } },
    }
  );

  for (const store of stores) {
    await getCampaignData(store, supabase);
  }

  return new Response(
    JSON.stringify({ message: "Klaviyo data fetch process completed." }),
    { headers: { "Content-Type": "application/json" } }
  );
});

