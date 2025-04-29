import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { streamText, tool } from "ai";
import { z } from "zod";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { queryDbTool } from "../tools/dbTool";
import { chartTool } from "../tools/chartTool";
import { systemPrompt } from "@/prompts/system";
// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // console.log(
  //   "Received chat request with messages:",
  //   JSON.stringify(messages, null, 2)
  // );

  try {
    const result = streamText({
      model: google("gemini-2.5-flash-preview-04-17"),
      messages,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingBudget: 24576,
          },
        } satisfies GoogleGenerativeAIProviderOptions,
      },
      onError: ({ error }) => {
        console.error("Error during streamText call:", error);
      },
      system: systemPrompt,

      tools: {
        query_database: queryDbTool,
        render_chart: chartTool,
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error during streamText call:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
