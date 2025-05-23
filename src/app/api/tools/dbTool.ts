import pg from "pg";
import { tool } from "ai";
import { z } from "zod";
import { databaseSchemaDescription } from "@/prompts/dbPrompt";

const { Pool } = pg;

export const queryDbTool = tool({
  description: databaseSchemaDescription,
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    const pool = new Pool({
      connectionString: process.env.POSTGRES_SESSION_POOLER_URL,
        ssl: {
          rejectUnauthorized: false, // Required for Supabase SSL
        },
      });
  
      let client: pg.PoolClient | null = null; // Define client outside try
  
      try {
        client = await pool.connect(); // Assign client
  
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
  
        const resultData = {
          rows: queryResult.rows,
          rowCount: queryResult.rowCount,
          fields: queryResult.fields.map((f) => ({
            name: f.name,
            dataTypeID: f.dataTypeID,
          })),
        };
  

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
  }
});

