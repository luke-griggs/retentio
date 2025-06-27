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

SECTION OPERATION GUIDELINES:
═══════════════════════════════════════════════

🚀 PREFERRED: Use semantic section operations for reliable table manipulation:

✅ ADD SECTION: Use action "add_section" 
   Parameters: section_name, section_content, section_position, target_section
   Example: action: "add_section", section_name: "CTA", section_content: "Shop Now", section_position: "end"

✅ REMOVE SECTION: Use action "remove_section"
   Parameters: section_name
   Example: action: "remove_section", section_name: "HEADER"

✅ MOVE SECTION: Use action "move_section"
   Parameters: section_name, section_position, target_section  
   Example: action: "move_section", section_name: "CTA", section_position: "after", target_section: "BODY"

✅ UPDATE SECTION NAME: Use action "update_section_name"
   Parameters: section_name, new_section_name
   Example: action: "update_section_name", section_name: "CALL TO ACTION", new_section_name: "CTA"

✅ UPDATE SECTION CONTENT: Use action "update_section_content"
   Parameters: section_name, section_content
   Example: action: "update_section_content", section_name: "BODY", section_content: "New email body text"

⚠️ FALLBACK: Only use "replace", "insert", "delete" for non-section operations like:
   - Editing text within a section (not the whole section)
   - Adding formatting, links, or styling
   - Complex text replacements

ALWAYS prioritize section operations over text operations for table modifications.`;

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
