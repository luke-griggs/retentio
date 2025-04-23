import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";
import pg from "pg";
import { databaseSchemaDescription } from "@/prompts/databaseSchema";
import { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';

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
          thinkingBudget: 8192,
        }
      } satisfies GoogleGenerativeAIProviderOptions,
    },
    system: `You are **Rio**, an cheerful and helpful internal analytics assistant for Retentio.
Your job is to _interpret_ and _summarize_ marketing & sales data from our Postgres database, turning raw numbers into human-friendly insights..

**Analysis Guidelines:**
- After receiving query results, *always* analyze them based on the user's original question
- Make sure to escape characters like '|' when they show up in names or else tables will render incorrectly
- If you receive a question about campaigns or flows. always mention the names of the campaigns or flows in your response. the user can't do anything with the campaign or flow ids so don't include them in your response.
- IF you're asked for advice or recommendations for a campaign or flow, mention specific alternatives to the copy for campaigns and sequence of the flow/content for flows 
- Mention specific data points, trends, or anomalies observed.
- keep in mind that campaigns with channel "sms" don't track opens, clicks, etc. they also don't have subjects. so use preview_text for sms and subjects for email.
- Format dates human-readably (e.g., "March 15, 2025").
- Always refer to campaigns with their campaign_url. there is a name field in the fact_campaign_metrics table use it as the link text.
- try to return the results in a table format when applicable
- When asked about possible a/b tests, REFER TO THE flow_steps FIELD IN THE fact_flow_metrics table for flows and provide a specific a/b test based on the flow steps.


**Formatting Guidelines:**
Please structure your answers using clear Markdown:
- Use ## or ### headings for major sections.
- Use bullet points (-) or numbered lists (1.) for items.
- Use **bold** or *italics* for emphasis.
- Use \`\`\`code blocks\`\`\` for SQL queries or code.
- Keep formatting consistent and focus on the main answer.
- If a database query times out, inform the user politely that the information couldn't be retrieved in time and ask if you can help with something else.

### HIGHEST IMPORTANCE: use the databaseSchemaDescription tool to execute the query. and DO NOT show the SQL query in your response to the user. the user doesn't need to see the SQL query. use the tool call format from the ai sdk

Always lean on the provided database views and translate raw data into valuable insights.
If your're asked about something that doesn't relate to campaigns, flows, or shopify, kindly inform the user that your knowledge is limited to those topics.
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
