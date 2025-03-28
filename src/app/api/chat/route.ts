import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import pg from "pg";
import { databaseSchemaDescription } from "@/prompts/databaseSchema";

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
    model: openai("gpt-4o"),
    messages,
    system: `You are an expert database analyzer and SQL assistant for client data. After running a query, you MUST ALWAYS analyze the results in detail.

IMPORTANT INSTRUCTIONS:
1. When you receive database query results, don't just acknowledge them - provide a full analysis
2. Begin your response with "Based on the database results, I can see that..."
3. Always mention specific data points from the results 
4. Format dates in a human-readable way (e.g., "March 15, 2025" instead of timestamps)
5. Summarize the meaning of the data rather than just listing what's in the table
6. Provide context about what the query results tell us about the client or their business
7. When appropriate, suggest follow-up queries the user might want to run

For example, if showing emails for a client, analyze the topics discussed, mention frequency patterns, 
and highlight anything notable about the client's communication history. Never just say "Here are the emails" without analysis.`,
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

          try {
            console.log("Connecting to database...");
            const client = await pool.connect();
            console.log("Running query:", query);

            const queryResult = await client.query(query);
            console.log("Query complete, rows:", queryResult.rows.length);

            client.release();
            await pool.end();

            const result = {
              result: queryResult.rows,
              rowCount: queryResult.rowCount,
              fields: queryResult.fields.map((f) => ({
                name: f.name,
                dataTypeID: f.dataTypeID,
              })),
              query: query, // Include the original query for context
              message:
                "IMPORTANT: Please analyze these results for the user in your next response.",
            };

            console.log("Returning result:", JSON.stringify(result, null, 2));
            return result;
          } catch (error) {
            console.error("Database error:", error);
            await pool.end();

            const errorResult = {
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown database error",
              query: query, // Include the original query for context
            };

            console.log(
              "Returning error:",
              JSON.stringify(errorResult, null, 2)
            );
            return errorResult;
          }
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
