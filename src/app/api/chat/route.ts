import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { convertToCoreMessages, streamText } from "ai";
import { z } from "zod";
import { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { queryDbTool } from "../tools/dbTool";
import { chartTool } from "../tools/chartTool";
import { viewImageTool } from "../tools/viewImageTool";
import { systemPrompt } from "@/prompts/system";
import { auditPrompt } from "@/prompts/audit";
import { anthropic, AnthropicProviderOptions } from "@ai-sdk/anthropic";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, chatMode } = await req.json();

  const selectedSystemPrompt =
    chatMode === "audit" ? auditPrompt : systemPrompt;

  try {
    const result = streamText({
      model: anthropic("claude-4-sonnet-20250514"),
      messages: convertToCoreMessages(messages, {
        tools: {
          query_database: queryDbTool,
          render_chart: chartTool,
          view_image: viewImageTool,
        },
      }),
      // headers: {
      //   "anthropic-beta": "interleaved-thinking-2025-05-14",
      // },
      // providerOptions: {
      //   anthropic: {
      //     thinking: {
      //       type: "enabled",
      //       budgetTokens: 12000,
      //     },
      //   } satisfies AnthropicProviderOptions,
      // },
      onError: ({ error }) => {
        console.error("Error during streamText call:", error);
      },
      system: selectedSystemPrompt,
      tools: {
        query_database: queryDbTool,
        render_chart: chartTool,
        view_image: viewImageTool,
      },
    });

    const messagesForModel = convertToCoreMessages(messages, {
      tools: {
        query_database: queryDbTool,
        render_chart: chartTool,
        view_image: viewImageTool,
      },
    })
    console.dir(messagesForModel, { depth: null });


    return result.toDataStreamResponse({
      sendReasoning: true,
  });
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
