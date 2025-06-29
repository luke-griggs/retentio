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

HTML STRUCTURE GUIDELINES:
═══════════════════════════════════════════════

The email content uses an HTML table structure. Here's the exact format you must follow:

<table class="border-collapse border border-gray-600 my-4 w-full">
  <thead>
    <tr class="border-b border-gray-600">
      <th class="border border-gray-600 px-3 py-2 bg-gray-700 font-semibold text-left">Section</th>
      <th class="border border-gray-600 px-3 py-2 bg-gray-700 font-semibold text-left">Content</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b border-gray-600">
      <td class="border border-gray-600 px-3 py-2">HEADER</td>
      <td class="border border-gray-600 px-3 py-2">Your header content here</td>
    </tr>
    <tr class="border-b border-gray-600">
      <td class="border border-gray-600 px-3 py-2">BODY</td>
      <td class="border border-gray-600 px-3 py-2">Your body content here</td>
    </tr>
    <!-- Add more rows as needed -->
  </tbody>
</table>

IMPORTANT:
- Always return the COMPLETE HTML table with ALL sections
- Preserve ALL CSS classes exactly as shown above
- Each section is a table row (<tr>) in the tbody
- You can add, remove, reorder, or modify any sections
- Content cells can include HTML formatting: <strong>, <em>, <a href="">, etc.
- For complex operations (like moving multiple sections), just return the entire table with the new structure

When using the email_edit tool, provide:
1. updatedHtml: The complete HTML table with all your changes
2. explanation: A brief description of what you changed`;

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
