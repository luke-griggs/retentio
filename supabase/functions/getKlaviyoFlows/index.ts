import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

console.log("Hello from Functions!");

// Interface for store configuration
interface Store {
  id: string;
  name: string;
  api_key: string | undefined;
  conversion_metric_id: string;
}

// Define stores (consider moving to a config or database)
const stores: Store[] = [
  {
    id: "1",
    name: "DRIP EZ",
    // @ts-ignore
    api_key: Deno.env.get("DRIP_EZ_KLAVIYO_API_KEY"),
    conversion_metric_id: "WsZZFn",
  },
];

// Interface for Klaviyo flow statistics results from the report endpoint
interface KlaviyoFlowStatsResult {
  groupings: {
    flow_id?: string;
    send_channel?: string;
    flow_message_id?: string;
  };
  statistics: Record<string, number | string | null>;
}

// Interface for Klaviyo flow message details (included data)
interface KlaviyoFlowMessage {
  type: string;
  id: string;
  attributes: {
    name?: string; // Flow messages have names
    channel?: string;
    content?: {
      subject?: string;
      preview_text?: string; // Added preview text
      // Add other relevant content fields if needed
    };
  };
}

// Interface for Klaviyo flow details (main data)
interface KlaviyoFlowDetails {
  data: {
    id: string;
    attributes: {
      name?: string;
      status?: string; // Added flow status
      archived?: boolean; // Added archived status
      created?: string;
      updated?: string;
    };
    relationships?: {
      "flow-messages"?: {
        data?: { type: string; id: string }[];
      };
      // Add other relevant relationships if needed
    };
  };
  included?: KlaviyoFlowMessage[]; // Includes flow messages
}

// Fetches and processes Klaviyo flow data for a given store
const getFlowData = async (store: Store, supabase: SupabaseClient) => {
  if (!store.api_key) {
    console.error(`API key missing for store ${store.name}. Skipping.`);
    return;
  }

  // Options for the Klaviyo flow values report API request
  const reportOptions = {
    method: "POST",
    headers: {
      accept: "application/vnd.api+json",
      revision: "2025-04-15", // Use the latest stable revision or one appropriate for flows
      "content-type": "application/vnd.api+json",
      Authorization: `Klaviyo-API-Key ${store.api_key}`,
    },
    body: JSON.stringify({
      data: {
        type: "flow-values-report", // Changed type to flow-values-report
        attributes: {
          timeframe: {
            key: "last_12_months", // Using "today", adjust as needed (e.g., "last_7_days")
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
    // Fetch the flow values report
    const reportResponse = await fetch(
      `https://a.klaviyo.com/api/flow-values-reports`, // Changed endpoint
      reportOptions
    );

    if (!reportResponse.ok) {
      console.error(
        `Error fetching Klaviyo flow report for store ${store.name}: ${reportResponse.status} ${reportResponse.statusText}`,
        await reportResponse.text()
      );
      return;
    }

    const reportData = await reportResponse.json();

    // Extract flow statistics results
    const flowStatsResults: KlaviyoFlowStatsResult[] =
      reportData?.data?.attributes?.results;

    if (flowStatsResults && flowStatsResults.length > 0) {
      // Fetch details for each unique flow ID found in the results
      // Group results by flow_id to fetch details only once per flow
      const flowIds = [
        ...new Set(
          flowStatsResults
            .map((result) => result.groupings?.flow_id)
            .filter((id): id is string => !!id) // Filter out undefined/null IDs
        ),
      ];

      // Process flow details sequentially to strictly control rate limits
      const flowDetailsResults = [];
      console.log(`Processing ${flowIds.length} unique flows sequentially...`);

      // Function to fetch details for one flow with retry logic
      const fetchFlowDetailsWithRetry = async (
        flowId: string,
        storeApiKey: string
      ) => {
        const detailOptions = {
          method: "GET",
          headers: {
            accept: "application/vnd.api+json",
            revision: "2025-04-15", // Match revision
            Authorization: `Klaviyo-API-Key ${storeApiKey}`,
          },
        };
        const detailUrl = `https://a.klaviyo.com/api/flows/${flowId}`;
        let attempts = 0;
        const maxRetries = 3;
        let delay = 2000; // Initial delay 2s

        while (attempts < maxRetries) {
          try {
            const detailResponse = await fetch(detailUrl, detailOptions);

            if (detailResponse.ok) {
              const details = await detailResponse.json();
              return { flow_id: flowId, details };
            }

            if (detailResponse.status === 429 && attempts < maxRetries - 1) {
              console.log(
                `Rate limited (429) on flow ${flowId}, attempt ${
                  attempts + 1
                }. Waiting ${delay / 1000}s before retry...`
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay *= 2; // Exponential backoff
              attempts++;
            } else {
              // Handle other errors or final failed retry
              console.error(
                `Error fetching details for flow ${flowId}: ${
                  detailResponse.status
                } ${detailResponse.statusText} (Attempt ${attempts + 1})`,
                await detailResponse.text()
              );
              return { flow_id: flowId, details: null }; // Failed after retries or non-429 error
            }
          } catch (fetchError) {
            console.error(
              `Network error fetching details for flow ${flowId} (Attempt ${
                attempts + 1
              }):`,
              fetchError
            );
            return { flow_id: flowId, details: null };
          }
        }
        // Should not be reached if maxRetries > 0, but safety return
        return { flow_id: flowId, details: null };
      };

      // Process flow IDs sequentially
      for (const flowId of flowIds) {
        console.log(`Fetching details for flow ${flowId}...`);
        const result = await fetchFlowDetailsWithRetry(flowId, store.api_key!); // Pass API key
        flowDetailsResults.push(result);

        // Add delay after each request completes to respect steady limit (60/m -> 1000ms per req)
        // 500ms delay + ~500ms API time = 1000ms cycle.
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Create a map for easy lookup of flow details by flow_id
      const detailsMap = new Map(
        flowDetailsResults.map((item) => [item.flow_id, item.details])
      );

      // Prepare data for insertion into Supabase
      const flowsToInsert = flowStatsResults.map((result) => {
        const flowId = result.groupings?.flow_id;
        const flowMessageId = result.groupings?.flow_message_id;
        const detailsData = flowId ? detailsMap.get(flowId) : null;

        // Construct the record for Supabase insertion
        return {
          store_name: store.name,
          flow_id: flowId ?? null,
          flow_message_id: flowMessageId ?? null,
          send_channel: result.groupings?.send_channel ?? null,
          ...result.statistics, // Spread the fetched statistics
          // Add details from the flow
          flow_name: detailsData?.data.attributes.name ?? null,
          flow_status: detailsData?.data.attributes.status ?? null,
          flow_created: detailsData?.data.attributes.created ?? null,
          flow_updated: detailsData?.data.attributes.updated ?? null,
          subject: null, // Set to null as we are not fetching it reliably
          preview_text: null, // Set to null as we are not fetching it reliably
          // Add any other relevant fields from detailsData if needed
        };
      });

      // Insert the prepared data into the Supabase 'klaviyo_flows' table
      if (flowsToInsert.length > 0) {
        console.log(
          `--- Attempting to insert ${flowsToInsert.length} enriched flow records for store ${store.name} ---`
        );

        const { error, data } = await supabase
          .from("klaviyo_flows") // Changed target table to klaviyo_flows
          .insert(flowsToInsert)
          .select(); // Select to confirm insertion

        if (error) {
          console.error(
            `Error inserting enriched flow data into Supabase for store ${store.name}:`,
            error
          );
          // Log detailed error information
          console.error("Error details:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          // Log the first record attempted to help debug serialization/type issues
          console.error(
            "First data record attempted:",
            JSON.stringify(flowsToInsert[0], null, 2)
          );
        } else {
          console.log(
            `Successfully inserted ${
              data?.length ?? flowsToInsert.length // Use returned data length if available
            } enriched flow records for store ${store.name}`
          );
        }
      } else {
        console.log(`No flow results found to process for store ${store.name}`);
      }
    } else {
      console.log(`No flow statistic results found for store ${store.name}`);
    }
  } catch (error) {
    console.error(
      `An unexpected error occurred processing flows for store ${store.name}:`,
      error
    );
  }
};

// Deno edge function handler
// @ts-ignore
Deno.serve(async (req: Request) => {
  // Retrieve Supabase credentials from environment variables
  // @ts-ignore
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  // @ts-ignore
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  // Get authorization header (e.g., service_role key)
  const authorization = req.headers.get("Authorization");

  // Validate required configuration
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase URL or Anon Key environment variables.");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!authorization) {
    // Ensure requests are authorized
    console.error("Authorization header missing.");
    return new Response(JSON.stringify({ error: "Authorization required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Initialize Supabase client with authorization
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
  });

  // Process flow data for each configured store
  // Use Promise.all for concurrent processing if desired and safe
  for (const store of stores) {
    await getFlowData(store, supabase); // Call the flow data function
  }

  console.log("Klaviyo flow data fetch process completed for all stores.");
  return new Response(
    JSON.stringify({ message: "Klaviyo flow data fetch process completed." }),
    { headers: { "Content-Type": "application/json" }, status: 200 }
  );
});
