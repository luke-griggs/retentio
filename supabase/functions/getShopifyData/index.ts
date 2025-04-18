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
  presentmentMoney: { amount: string; currencyCode: string };
}

interface ShopifyRefundNode {
  id: string;
  createdAt: string;
  totalRefundedSet: MoneySet | null;
}

interface ShopifyRefundConnection {
  edges: { node: ShopifyRefundNode }[];
}

interface ShopifyTransaction {
  // Transactions might not be a connection in the response based on query
  id: string;
  amountSet: MoneySet | null;
  status: string | null;
  createdAt: string;
  kind: string | null;
  gateway: string | null;
}

interface ShopifyOrderNode {
  id: string;
  confirmationNumber: string | null;
  name: string;
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  currentShippingPriceSet: MoneySet | null;
  currentSubtotalPriceSet: MoneySet | null;
  displayRefundStatus: string | null;
  email: string | null;
  fullyPaid: boolean;
  processedAt: string | null;
  refunds: ShopifyRefundConnection | null; // Nested structure with edges
  subtotalPriceSet: MoneySet | null;
  totalRefundedSet: MoneySet | null;
  transactions: ShopifyTransaction[] | null; // Array of transactions
  unpaid: boolean;
  updatedAt: string;
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
          confirmationNumber
          name
          customer {
            id
            firstName
            lastName
            email
          }
          cancelledAt
          cancelReason
          createdAt
          currentShippingPriceSet {
             shopMoney { amount currencyCode }
             presentmentMoney { amount currencyCode }
          }
          currentSubtotalPriceSet {
             shopMoney { amount currencyCode }
             presentmentMoney { amount currencyCode }
          }
          email
          fullyPaid
          processedAt
          subtotalPriceSet {
             shopMoney { amount currencyCode }
             presentmentMoney { amount currencyCode }
          }
          totalRefundedSet {
             shopMoney { amount currencyCode }
             presentmentMoney { amount currencyCode }
          }
          transactions(first: 10) { # Adjust if more transactions needed
             id
             amountSet {
               shopMoney { amount currencyCode }
               presentmentMoney { amount currencyCode }
             }
             status
             createdAt
             kind
             gateway
          }
          unpaid
          updatedAt
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
  const BATCH_SIZE = 50; // Number of orders to fetch per request

  console.log(
    `Fetching orders for store: ${store.name} with filter: ${queryFilter} using API v2025-04`
  );

  while (hasNextPage) {
    const variables = {
      first: BATCH_SIZE,
      query: queryFilter,
      cursor: cursor,
    };

    try {
      const response = await fetch(shopifyUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ query: GET_RECENT_ORDERS_QUERY, variables }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Shopify API request failed for ${store.name}: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

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
        console.warn(
          `No orders found or unexpected response structure for ${store.name}:`,
          result
        );
        hasNextPage = false;
      }

      // Optional: Add a small delay to avoid hitting rate limits
      if (hasNextPage) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
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

  // Calculate the date 1 year ago for the Shopify query
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);
  const queryDate = oneYearAgo.toISOString();
  const queryFilter = `created_at:>'${queryDate}'`;

  // Use array type since we don't have Database types
  let allFetchedOrders: any[] = [];
  const errors: string[] = [];

  for (const store of stores) {
    try {
      const orders = await fetchOrdersFromShopify(store, queryFilter);
      if (orders.length > 0) {
        // Map fetched data to the structure expected by the Supabase table
        const dataToInsert = orders.map((order) => ({
          store_name: store.name,
          shopify_order_id: order.id, // Use Shopify's GID
          confirmation_number: order.confirmationNumber,
          order_name: order.name, // e.g., #1001
          // Cast complex objects to JSON for Supabase JSONB column
          customer: order.customer,
          cancelled_at: order.cancelledAt
            ? new Date(order.cancelledAt).toISOString()
            : null,
          cancel_reason: order.cancelReason,
          created_at: new Date(order.createdAt).toISOString(),
          current_shipping_price_set: order.currentShippingPriceSet,
          current_subtotal_price_set: order.currentSubtotalPriceSet,
          display_refund_status: order.displayRefundStatus,
          email: order.email,
          fully_paid: order.fullyPaid,
          processed_at: order.processedAt
            ? new Date(order.processedAt).toISOString()
            : null,
          // Map refund nodes and cast to JSON
          refunds: order.refunds?.edges?.map((e) => e.node) || [],
          subtotal_price_set: order.subtotalPriceSet,
          total_refunded_set: order.totalRefundedSet,
          // Cast transactions array to JSON
          transactions: order.transactions || [],
          unpaid: order.unpaid,
          updated_at: new Date(order.updatedAt).toISOString(),
        }));
        allFetchedOrders = allFetchedOrders.concat(dataToInsert);
        console.log(
          `Prepared ${dataToInsert.length} records for insertion from ${store.name}.`
        );
      }
    } catch (error: unknown) {
      // Explicitly type error as unknown
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Failed to process store ${store.name}:`, errorMessage);
      errors.push(`Failed for ${store.name}: ${errorMessage}`);
    }
  }

  // Insert fetched data into Supabase
  if (allFetchedOrders.length > 0) {
    console.log(
      `Attempting to insert/upsert ${allFetchedOrders.length} total records into shopify_data...`
    );
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
