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


// Interface for a single action within a flow definition
interface FlowAction {
  id?: string;
  type: string; // e.g., 'time-delay', 'send-email', 'conditional-split'
  data?: any; // Use 'any' for simplicity, or define specific data structures
}

// Interface for Klaviyo flow message details (included data)
interface KlaviyoFlowDetails {
  data: {
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
      status?: string; // Added flow status
      archived?: boolean; // Added archived status
      created?: string;
      updated?: string;
      trigger_type?: string; // Added trigger type
      definition?: {
        // Added definition object
        triggers?: any[]; // Keep triggers if needed, or omit
        actions?: FlowAction[]; // Array of flow actions
      };
    };
  };
}

// Interface for the records created by joining report stats and flow details
interface FlowRecord {
  store_name: string;
  flow_id: string | null;
  flow_message_id: string | null;
  send_channel: string | null;
  // Statistics from report
  average_order_value?: number | string | null;
  bounce_rate?: number | string | null;
  bounced?: number | string | null;
  click_rate?: number | string | null;
  click_to_open_rate?: number | string | null;
  clicks?: number | string | null;
  clicks_unique?: number | string | null;  
  conversion_rate?: number | string | null;
  conversion_uniques?: number | string | null;
  conversion_value?: number | string | null;
  conversions?: number | string | null;
  delivered?: number | string | null;
  delivery_rate?: number | string | null;
  open_rate?: number | string | null;
  opens?: number | string | null;
  opens_unique?: number | string | null;
  recipients?: number | string | null;
  revenue_per_recipient?: number | string | null;
  unsubscribe_rate?: number | string | null;
  unsubscribe_uniques?: number | string | null;
  unsubscribes?: number | string | null;
  // Details from flow definition
  flow_name: string | null;
  flow_status: string | null;
  flow_steps: Record<string, any>[];
}

async function upsertFlowDim(
  data: FlowRecord[],
  sb: SupabaseClient
) {
  // Upsert the combined flow dimension data
  // The 'data' parameter now explicitly expects an array of FlowRecord objects
  return await sb
    .from("flows_dim")
    .upsert(data, { onConflict: "flow_message_id" });
}

async function upsertFlowSnapshot(data: FlowRecord[], sb: SupabaseClient) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Map FlowRecord data to the structure needed for flow_metrics_daily
  const snapshots = data
    .map((record) => {
      // Ensure required fields for the snapshot are present
      if (!record.flow_message_id || !record.flow_name) {
        console.warn(
          `Skipping snapshot for record missing flow_message_id or flow_name. Flow ID: ${record.flow_id}`
        );
        return null; // Skip this record if essential identifiers are missing
      }
      return {
        store_name: record.store_name, // Include if store_name is part of the table/PK
        flow_name: record.flow_name,
        flow_message_id: record.flow_message_id,
        snapshot_date: today,
        // Use nullish coalescing to provide default values (e.g., 0) if stats are null/undefined
        clicks_cum: record.clicks_unique ?? 0,
        revenue_cum: record.conversion_value ?? 0,
        recipients_cum: record.recipients ?? 0,
        conversions_cum: record.conversion_uniques ?? 0,
        opens_cum: record.opens_unique ?? 0,
        bounces_cum: record.bounced ?? 0,
        unsubscribes_cum: record.unsubscribe_uniques ?? 0,
      };
    })
    .filter((snapshot) => snapshot !== null); // Filter out any null entries resulting from missing data

  // Proceed with upsert only if there are valid snapshot objects
  if (snapshots.length > 0) {
    console.log(`Attempting to upsert ${snapshots.length} snapshots.`);
    // Upsert the prepared snapshot data
    // Ensure the table 'flow_metrics_daily' has a composite key on (flow_message_id, snapshot_date)
    return await sb
      .from("flow_metrics_daily")
      .upsert(snapshots, { onConflict: "flow_message_id,snapshot_date" });
  } else {
    console.log("No valid snapshots generated to upsert.");
    // Return a structure consistent with Supabase client responses when no operation is performed
    return {
      error: null,
      data: [],
      count: 0,
      status: 204,
      statusText: "No Content",
    };
  }
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
            key: "last_365_days", // Using "today", adjust as needed (e.g., "last_7_days")
          },
          conversion_metric_id: store.conversion_metric_id,
          statistics: [
            "average_order_value",
            "bounce_rate",
            "bounced",
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
      `https://a.klaviyo.com/api/flow-values-reports`, 
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
      // Add explicit type for flowDetailsResults
      const flowDetailsResults: {
        flow_id: string;
        details: KlaviyoFlowDetails | null;
      }[] = [];
      console.log(`Processing ${flowIds.length} unique flows sequentially...`);

      // Function to fetch details for one flow with retry logic
      const fetchFlowDetailsWithRetry = async (
        flowId: string,
        storeApiKey: string
      ): Promise<{ flow_id: string; details: KlaviyoFlowDetails | null }> => {
        // Added return type promise
        const detailOptions = {
          method: "GET",
          headers: {
            accept: "application/vnd.api+json",
            revision: "2025-04-15", // Match revision
            Authorization: `Klaviyo-API-Key ${storeApiKey}`,
          },
        };
        const detailUrl = `https://a.klaviyo.com/api/flows/${flowId}?additional-fields[flow]=definition`;
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
            // Corrected catch block placement
            console.error(
              `Network error fetching details for flow ${flowId} (Attempt ${
                attempts + 1
              }):`,
              fetchError
            );
            // It's often better to return null or a specific error structure
            // instead of re-throwing or returning details: null without context.
            return { flow_id: flowId, details: null }; // Indicate failure
          } // End of catch
        } // End of while loop
        // Should not be reached if maxRetries > 0, but safety return
        console.warn(`Max retries reached for flow ${flowId}. Returning null.`);
        return { flow_id: flowId, details: null };
      }; // End of fetchFlowDetailsWithRetry

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
      const flowsToInsert: FlowRecord[] = flowStatsResults.map((result) => {
        const flowId = result.groupings?.flow_id;
        const flowMessageId = result.groupings?.flow_message_id;
        // Explicitly handle potential undefined from Map.get, although logic should prevent it
        const detailsData: KlaviyoFlowDetails | null = flowId
          ? detailsMap.get(flowId) ?? null // Default to null if undefined
          : null;

        // Process the actions array into a simplified summary
        let processedActions: Record<string, any>[] = [];
        if (detailsData?.data?.attributes?.definition?.actions) {
          const rawActions = detailsData.data.attributes.definition.actions;
          processedActions = rawActions.map((action: FlowAction) => {
            const summary: Record<string, any> = { type: action.type };
            // Extract relevant data based on action type
            if (
              action.type === "send-email" &&
              action.data?.message?.subject_line
            ) {
              summary.subject = action.data.message.subject_line;
            }
            if (action.type === "send-sms" && action.data?.message?.body) {
              summary.body = action.data.message.body;
            }
            if (
              action.type === "time-delay" &&
              action.data?.value &&
              action.data?.unit
            ) {
              summary.delay_value = action.data.value;
              summary.delay_unit = action.data.unit;
            }
            if (
              action.type === "send-mobile-push" &&
              action.data?.message?.title
            ) {
              summary.title = action.data.message.title;
            }
            if (
              action.type === "send-mobile-push" &&
              action.data?.message?.body
            ) {
              summary.body = action.data.message.body;
            }
            // Add more conditions here for other action types if needed
            return summary;
          });
        }

        // Construct the FlowRecord object
        return {
          store_name: store.name,
          flow_id: flowId ?? null,
          flow_message_id: flowMessageId ?? null,
          send_channel: result.groupings?.send_channel ?? null,
          // Spread the fetched statistics directly into the record
          ...result.statistics,
          // Add details from the flow definition
          flow_name: detailsData?.data.attributes.name ?? null,
          flow_status: detailsData?.data.attributes.status ?? null,
          flow_steps: processedActions, // Add the processed actions array
          last_seen: new Date().toISOString(),
        };
      });

      // Upsert the flow dimension data
      if (flowsToInsert.length > 0) {
        console.log(
          `--- Attempting to upsert ${flowsToInsert.length} flow dimension records for store ${store.name} ---`
        );
        // Use distinct variable names for error and data from each upsert call
        const { error: dimError, data: dimData } = await upsertFlowDim(
          flowsToInsert,
          supabase
        );

        if (dimError) {
          console.error(
            `Error upserting flowDimData into Supabase for store ${store.name}:`,
            dimError
          );
          // Log detailed error information if available
          console.error("Error details:", {
            code: (dimError as any).code, // Type assertion needed if error type isn't specific enough
            message: dimError.message,
            details: (dimError as any).details,
            hint: (dimError as any).hint,
          });
          // Log the first record attempted to help debug serialization/type issues
          console.error(
            "First data record attempted for dim:",
            JSON.stringify(flowsToInsert[0], null, 2)
          );
        } else {
          // Log success, using the length from the response if available
          console.log(
            `Successfully upserted ${
              dimData?.length ?? flowsToInsert.length
            } flow dimension records for store ${store.name}`
          );
        }

        // Upsert the daily flow metrics snapshot data
        console.log(
          `--- Attempting to upsert snapshots for ${flowsToInsert.length} flow records for store ${store.name} ---`
        );
        // Call upsertFlowSnapshot with the prepared data
        const { error: snapshotError, data: snapshotData } =
          await upsertFlowSnapshot(flowsToInsert, supabase);

        if (snapshotError) {
          console.error(
            `Error upserting flow snapshot data into Supabase for store ${store.name}:`,
            snapshotError
          );
          // Log detailed error information
          console.error("Error details:", {
            code: (snapshotError as any).code,
            message: snapshotError.message,
            details: (snapshotError as any).details,
            hint: (snapshotError as any).hint,
          });
          // Log the first record that would have been used for snapshot creation (if available)
          const firstValidRecord = flowsToInsert.find(
            (r) => r.flow_message_id && r.flow_name
          );
          console.error(
            "First valid data record for snapshot generation:",
            JSON.stringify(firstValidRecord, null, 2)
          );
        } else {
          // Log success, using the length from the response (snapshotData could be an array or status object)
          const upsertedCount = Array.isArray(snapshotData)
            ? snapshotData.length
            : snapshotData?.count ?? 0;
          console.log(
            `Successfully upserted ${upsertedCount} flow snapshot records for store ${store.name}`
          );
        }
      } else {
        console.log(`No flow results found to process for store ${store.name}`);
      }
    } else {
      console.log(`No flow statistic results found for store ${store.name}`);
    }
  } catch (err) {
    // Changed variable name from error to err to avoid conflict
    console.error(
      `An unexpected error occurred processing flows for store ${store.name}:`,
      err
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
