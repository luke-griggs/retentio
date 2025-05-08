// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define the structure for a store's configuration
interface Store {
  id: number;
  name: string;
  access_token: string;
  store_url: string; // e.g., "your-store.myshopify.com" (domain only)
}

const stores: Store[] = [
  {
    id: 1,
    name: "DRIP EZ",
    // NOTE: Reverted to hardcoded for now as Deno.env was removed by user edit. Ideally use env vars.
    // @ts-ignore
    access_token: Deno.env.get("DRIP_EZ_SHOPIFY_ACCESS_TOKEN"),
    store_url: "drip-ez.myshopify.com", // Domain only
  },
];

// Define the structure of the data returned by Shopify's GraphQL API (refined)
interface MoneySet {
  shopMoney: { amount: string; currencyCode: string };
  // presentmentMoney is no longer needed if we only use shopMoney
  // presentmentMoney: { amount: string; currencyCode: string };
}

interface ShopifyOrderNode {
  id: string;
  createdAt: string;
  currentShippingPriceSet: MoneySet | null;
  currentSubtotalPriceSet: MoneySet | null;
  email: string | null;
}

interface ShopifyOrderEdge {
  node: ShopifyOrderNode;
  cursor: string;
}

interface ShopifyOrdersResponse {
  data: {
    orders: {
      edges: ShopifyOrderEdge[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
  extensions?: unknown; // Use unknown instead of any
}

// Define the GraphQL query to fetch orders created in the last 7 days
const GET_RECENT_ORDERS_QUERY = `
  query GetRecentOrders($first: Int!, $query: String, $cursor: String) {
    orders(first: $first, query: $query, after: $cursor, sortKey: CREATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id
          createdAt
          currentShippingPriceSet {
             shopMoney { amount currencyCode }
          }
          currentSubtotalPriceSet {
             shopMoney { amount currencyCode }
          }
          email
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

// Function to fetch orders from a single store, handling pagination
async function fetchOrdersFromShopify(
  store: Store,
  queryFilter: string
): Promise<ShopifyOrderNode[]> {
  const shopifyUrl = `https://${store.store_url}/admin/api/2025-04/graphql.json`; // Updated API version
  const headers = {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": store.access_token,
  };

  let allOrders: ShopifyOrderNode[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  const BATCH_SIZE = 250; // Number of orders to fetch per request

  console.log(
    `Fetching orders for store: ${store.name} with filter: ${queryFilter} using API v2025-04`
  );

  while (hasNextPage) {
    const variables = {
      first: BATCH_SIZE,
      query: queryFilter,
      cursor: cursor,
    };

    let response: Response;
    try {
      response = await fetch(shopifyUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ query: GET_RECENT_ORDERS_QUERY, variables }),
      });
    } catch (fetchError: unknown) {
      // Catch errors during the fetch call itself (e.g., network issues)
      console.error(
        `Network error during fetch for ${store.name}:`,
        fetchError instanceof Error ? fetchError.message : String(fetchError)
      );
      // Stop pagination for this store on fetch error
      hasNextPage = false;
      continue; // Move to the next iteration of the while loop
    }

    // Check if the response status is OK (e.g., 200)
    if (!response.ok) {
      const errorBody = await response.text(); // Read response body as text
      console.error(
        `Shopify API request failed for ${store.name}: ${response.status} ${response.statusText}. Response Body:`,
        errorBody // Log the raw error body
      );
      // Potentially add retry logic here later based on status code (e.g., 429 for rate limits)
      hasNextPage = false; // Stop pagination on non-OK response
      continue;
    }

    // Try to parse the response as JSON
    try {
      const result: ShopifyOrdersResponse = await response.json();

      if (result.data?.orders?.edges) {
        const fetchedOrders = result.data.orders.edges.map((edge) => edge.node);
        console.log(
          `Fetched ${fetchedOrders.length} orders for ${store.name} (Cursor: ${cursor})`
        );
        allOrders = allOrders.concat(fetchedOrders);
        hasNextPage = result.data.orders.pageInfo.hasNextPage;
        cursor = result.data.orders.pageInfo.endCursor;
      } else {
        // console.warn(
        //   `No orders found or unexpected response structure for ${store.name}:`,
        //   result
        // );
        hasNextPage = false;
      }

      // Optional: Add a small delay to avoid hitting rate limits
      // if (hasNextPage) {
      //   await new Promise((resolve) => setTimeout(resolve, 500));
      // }
    } catch (error: unknown) {
      console.error(
        `Error fetching orders from ${store.name}:`,
        error instanceof Error ? error.message : String(error)
      );
      hasNextPage = false; // Stop pagination on error
      // Decide if you want to throw the error up or just log and continue
      // throw error; // Uncomment to stop the whole function on error
    }
  }
  console.log(
    `Finished fetching. Total orders for ${store.name}: ${allOrders.length}`
  );
  return allOrders;
}

// Main Edge Function handler
// @ts-ignore
Deno.serve(async (req: Request) => {
  console.log("Shopify data fetch function started.");

  // @ts-ignore
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  // @ts-ignore
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables."
    );
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Initialize Supabase client (without Database type)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
  });

  // --- Define Date Ranges for Months (going back 1 year) ---
  const monthsToFetch: {
    start: Date;
    end: Date;
    filter: string;
    description: string;
  }[] = [];
  const now = new Date();

  for (let i = 12; i > 0; i--) {
    const endDate = new Date(now);
    endDate.setMonth(now.getMonth() - (i - 1)); // End of the month (start of the *next* month)
    endDate.setDate(1);
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(now);
    startDate.setMonth(now.getMonth() - i); // Start of the month
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const queryDateStart = startDate.toISOString();
    const queryDateEnd = endDate.toISOString();
    const queryFilter = `created_at:>=${queryDateStart} AND created_at:<${queryDateEnd}`;
    const description = `Month ${13 - i}: ${startDate.getFullYear()}-${String(
      startDate.getMonth() + 1
    ).padStart(2, "0")} (from ${queryDateStart} to ${queryDateEnd})`;

    monthsToFetch.push({
      start: startDate,
      end: endDate,
      filter: queryFilter,
      description: description,
    });
  }

  // --- Select the Month to Run ---
  // --> Set monthIndex to 0 for the first month (12 months ago)
  // --> Increment monthIndex (1, 2, ... 11) to run subsequent months
  const monthIndex = 11; // 0 = 12 months ago, 1 = 11 months ago, ..., 11 = last month

  if (monthIndex < 0 || monthIndex >= monthsToFetch.length) {
    console.error("Invalid monthIndex selected.");
    return new Response(JSON.stringify({ error: "Invalid configuration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const activeMonth = monthsToFetch[monthIndex];
  const activeQueryFilter = activeMonth.filter;
  const activeRunDescription = activeMonth.description;

  console.log(`Starting run for: ${activeRunDescription}`);

  // Use array type since we don't have Database types
  let allFetchedOrders: any[] = [];
  const errors: string[] = [];

  // Process stores concurrently
  const storeProcessingPromises = stores.map(async (store) => {
    try {
      // Fetch orders using the currently active query filter
      const orders = await fetchOrdersFromShopify(store, activeQueryFilter);

      if (orders.length > 0) {
        // Map fetched data
        const mappedData = orders.map((order) => {
          // Calculate order_value safely
          const subtotal = parseFloat(
            order.currentSubtotalPriceSet?.shopMoney?.amount ?? "0"
          );
          const shipping = parseFloat(
            order.currentShippingPriceSet?.shopMoney?.amount ?? "0"
          );
          const order_value = subtotal + shipping;

          // Basic check for created_at validity
          let isoCreatedAt: string | null = null;
          try {
            isoCreatedAt = order.createdAt
              ? new Date(order.createdAt).toISOString()
              : null;
          } catch (e) {
            console.warn(
              `Could not parse createdAt date: ${order.createdAt} for order ${order.id}`
            );
          }

          return {
            store_name: store.name,
            shopify_order_id: order.id, // Use Shopify's GID (Should be non-null from GQL)
            created_at: isoCreatedAt, // Keep order date (Potentially null if parsing failed)
            order_value: order_value, // Add calculated revenue
            email: order.email, // Keep email
          };
        });

        // Filter out records with null/undefined/NaN in any required field before adding
        const validDataToInsert = mappedData.filter(
          (d) =>
            d.store_name &&
            d.shopify_order_id &&
            d.created_at &&
            d.order_value !== null &&
            d.order_value !== undefined &&
            !isNaN(d.order_value) &&
            d.email
        );

        if (validDataToInsert.length !== mappedData.length) {
          console.warn(
            `Filtered out ${
              mappedData.length - validDataToInsert.length
            } records due to missing store_name, shopify_order_id, created_at, order_value, or email.`
          );
        }

        // Return valid data for this store
        return validDataToInsert;
      }
      return []; // Return empty array if no orders
    } catch (error: unknown) {
      // Explicitly type error as unknown
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Failed to process store ${store.name}:`, errorMessage);
      errors.push(`Failed for ${store.name}: ${errorMessage}`);
      return []; // Return empty array on error for this store
    }
  });

  // Wait for all store processing to complete
  const resultsFromStores = await Promise.all(storeProcessingPromises);

  // Flatten the results from all stores into the final array
  allFetchedOrders = resultsFromStores.flat();

  // Insert fetched data into Supabase
  if (allFetchedOrders.length > 0) {
    console.log(
      `Attempting to insert/upsert ${allFetchedOrders.length} total records into shopify_data...`
    );
    // ---> ADDED: Log the data being sent to upsert for debugging
    console.log("Data for upsert:", JSON.stringify(allFetchedOrders, null, 2));

    // Ignore the 'data' part of the response as it's not used
    const { error: dbError } = await supabase
      .from("shopify_data")
      .upsert(allFetchedOrders, { onConflict: "shopify_order_id" }); // Upsert based on Shopify order ID

    if (dbError) {
      console.error("Supabase DB Error:", dbError);
      errors.push(`Database insert/upsert failed: ${dbError.message}`);
    } else {
      console.log(`Successfully upserted ${allFetchedOrders.length} records.`);
    }
  } else {
    console.log("No new orders found to insert.");
  }

  // Prepare response
  const responsePayload = {
    message: `Shopify data sync finished. Processed ${stores.length} store(s). Fetched/Upserted ${allFetchedOrders.length} records.`,
    errors: errors,
  };

  return new Response(JSON.stringify(responsePayload), {
    headers: { "Content-Type": "application/json" },
    status: errors.length > 0 ? 500 : 200,
  });
});
