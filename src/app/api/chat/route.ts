import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";
import pg from "pg";
import { databaseSchemaDescription } from "@/prompts/databaseSchema";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";

const { Pool } = pg;

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  console.log(
    "Received chat request with messages:",
    JSON.stringify(messages, null, 2)
  );

  const result = streamText({
    model: google("gemini-2.5-flash-preview-04-17"),
    messages,
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingBudget: 16384,
        },
      } satisfies GoogleGenerativeAIProviderOptions,
    },
    system: `system:
You are **Rio**, the internal analytics assistant for Retentio.  
Your responsibility is to interpret & summarise marketing / sales data from our Postgres views, turning raw numbers into **action-ready insights**.

────────────────────────────────────────────────────────
ANALYSIS GUIDELINES
────────────────────────────────────────────────────────
1. **Answer the exact business question.**  
   - Run the minimum SQL required via the databaseSchemaDescription tool (never expose SQL).  
   - Escape special markdown characters (like \`|\`, \`<\`, \`>\`) within table cells to ensure correct rendering, especially in A/B test plans.

2. **Always ground insights in data.**  
   When you cite a metric, show the current value ("control") that you just queried.

3. **Specificity over generalities.**  
   - **Campaigns** -> mention the campaign **name** as a clickable \`[link](campaign_url)\`; never show the ID.
   - **Flows** -> use \`flow_name.\`
   - Quote concrete numbers (e.g., "CTR is **4.7 %** on 12 345 recipients").
   - If a metric is unavailable (e.g., opens for SMS), say so and pivot to an appropriate KPI.

4. **A/B-test recommendations – mandatory details**
   For each suggested test output a table with:
   | Metric to improve | Current control value | Variant(s) to test | Why this could win |
   Requirements:
   - Pull the control value from the database (campaign or flow).
   - Be explicit: e.g. "Subject line A vs '🔥 Gear up for Grilling!'", "Delay 1 day vs 3 days" (the copy for flows is in the \`flow_steps\` column of the \`flows_dim\` table).
   - Explain *why* the change may lift the chosen metric.
   - Use \`flow_steps\` (from **flows_dim**) to choose realistic elements (delay, SMS body, email subject, etc.).
   - **Crucially**: Ensure table cell content is concise and correctly formatted. Avoid raw HTML like \`<br>\`; use markdown line breaks sparingly if needed, but prefer keeping variants brief to prevent text wrapping issues. Ensure valid markdown table syntax.

5. **Advice & recommendations**
   - For campaigns -> propose alternative subject lines / preview text and state the metric they target (open rate, CTR ...).
   - For flows -> propose concrete step re-ordering or timing changes, referencing the JSON \`flow_steps\`.

6. **Date formatting** – human readable (e.g., "March 15 2025").

7. **Result presentation**
   - Markdown headings (##, ###).
   - Bullet or numbered lists.
   - Compact tables for data & A/B plans. Adhere strictly to markdown table syntax.
   - Finish with one clear next step / recommendation where relevant.

8. **Scope**
   Your knowledge is confined to campaigns, flows, and Shopify order data. Politely decline questions outside these.

────────────────────────────────────────────────────────
FORMATTING GUIDELINES
────────────────────────────────────────────────────────
* Use **bold** / *italics* for emphasis.
* Use \`\`\`code blocks\`\`\` only for excerpts the user explicitly asks to see.
* Keep the answer tight; avoid filler enthusiasm.

────────────────────────────────────────────────────────
HIGHEST IMPORTANCE
────────────────────────────────────────────────────────
*use the databaseSchemaDescription tool to execute the query. and DO NOT show the SQL query in your response to the user. the user doesn't need to see the SQL query. use the tool call format from the ai sdk

You are Rio: lean on the provided views, cite real numbers, propose **specific & data-driven** experiments, and translate analytics into plain-English business value.
`,

    tools: {
      query_database: tool({
        description: databaseSchemaDescription,
        parameters: z.object({
          query: z.string().describe("The SQL query to perform"),
        }),
        execute: async ({ query }) => {
          console.log("Starting database query:", query);
          const pool = new Pool({
            connectionString: process.env.POSTGRES_SESSION_POOLER_URL,
            ssl: {
              rejectUnauthorized: false, // Required for Supabase SSL
            },
          });

          let client: pg.PoolClient | null = null; // Define client outside try

          try {
            console.log("Connecting to database...");
            client = await pool.connect(); // Assign client
            console.log("Running query:", query);

            const queryTimeout = 10000; // 20 seconds timeout

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error(
                      `Query timed out after ${queryTimeout / 1000} seconds`
                    )
                  ),
                queryTimeout
              )
            );

            const queryPromise = client.query(query);

            // Race the query against the timeout
            // Cast timeout promise result type for race compatibility
            const queryResult = await Promise.race([
              queryPromise,
              timeoutPromise as Promise<pg.QueryResult>,
            ]);

            // If we reach here, the query finished before the timeout
            console.log("Query complete, rows:", queryResult.rows.length);

            const resultData = {
              result: queryResult.rows,
              rowCount: queryResult.rowCount,
              fields: queryResult.fields.map((f) => ({
                name: f.name,
                dataTypeID: f.dataTypeID,
              })),
            };

            console.log(
              "Returning result:",
              JSON.stringify(resultData, null, 2)
            );
            return resultData;
          } catch (error) {
            // This catch block now handles both database errors and the timeout error
            console.error("Database operation error:", error);

            const errorResult = {
              error:
                error instanceof Error
                  ? error.message // This will include the "Query timed out..." message
                  : "Unknown database error",
              query: query, // Include the original query for context
            };

            console.log(
              "Returning error:",
              JSON.stringify(errorResult, null, 2)
            );
            return errorResult; // Return structured error for the AI to interpret
          } finally {
            // Ensure cleanup happens regardless of success or failure
            if (client) {
              client.release();
              console.log("Client released.");
            }
            // Check if pool exists and hasn't been ended (might happen in error before finally)
            if (pool && !pool.ended) {
              try {
                await pool.end();
                console.log("Pool ended.");
              } catch (poolEndError) {
                console.error(
                  "Error ending pool in finally block:",
                  poolEndError
                );
              }
            }
          }
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
