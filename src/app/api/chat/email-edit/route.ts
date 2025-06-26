import { convertToCoreMessages, streamText } from "ai";
import { emailEditTool } from "../../tools/emailEditTool";
import { emailEditPrompt } from "@/prompts/emailEdit";
import { google } from "@ai-sdk/google";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, campaignId, currentContent } = await req.json();

    console.log("Email edit request received for campaign:", campaignId);

    // Include the current email content in the system prompt
    const systemPrompt = `${emailEditPrompt}

───────────────────────────────────────────────
CURRENT EMAIL CONTENT
───────────────────────────────────────────────
${currentContent}
───────────────────────────────────────────────

Campaign ID: ${campaignId}

Remember to use the email_edit tool for all content modifications. Be precise with the target text to ensure accurate replacements.`;

    const result = streamText({
      model: google("gemini-2.5-flash"),
      messages: convertToCoreMessages(messages),
      system: systemPrompt,
      tools: {
        email_edit: emailEditTool,
      },
      onError: ({ error }) => {
        console.error("Error during email edit streamText call:", error);
      },
      onFinish: ({ text, toolCalls, toolResults }) => {
        console.log("Stream finished");
        console.log("Tool calls:", toolCalls);
        console.log("Tool results:", toolResults);
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in email-edit route:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process email editing request" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
