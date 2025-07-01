import { convertToCoreMessages, streamText } from "ai";
import { emailEditTool } from "../../tools/emailEditTool";
import { emailEditPrompt } from "@/prompts/emailEdit";
import { google } from "@ai-sdk/google";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Helper function to process PDF attachments and include them in messages
// TODO: Make this actually work
async function processAttachments(messages: any[]) {
  const processedMessages = await Promise.all(
    messages.map(async (message) => {
      if (
        message.experimental_attachments &&
        message.experimental_attachments.length > 0
      ) {
        const parts = [];

        // Add the text content if any
        if (message.content) {
          parts.push({ type: "text", text: message.content });
        }

        // Process each attachment
        for (const attachment of message.experimental_attachments) {
          const isPDF = attachment.contentType === "application/pdf";

          if (isPDF) {
            try {
              console.log(`Fetching PDF from URL: ${attachment.url}`);
              const response = await fetch(attachment.url);
              if (!response.ok) {
                throw new Error(`Failed to fetch PDF: ${response.status}`);
              }

              const pdfData = await response.arrayBuffer();
              console.log(
                `PDF fetched successfully, size: ${pdfData.byteLength} bytes`
              );

              parts.push({
                type: "file",
                data: pdfData,
                mediaType: "application/pdf",
              });
            } catch (error) {
              console.error(`Error fetching PDF ${attachment.name}:`, error);
              parts.push({
                type: "text",
                text: `\n\n[Error: Could not read PDF file ${attachment.name}]`,
              });
            }
          } else {
            // For non-PDF files, include as text note
            parts.push({
              type: "text",
              text: `\n\n[Note: File "${attachment.name}" was attached but is not a PDF]`,
            });
          }
        }

        return {
          ...message,
          content: parts,
          experimental_attachments: undefined, // Remove attachments after processing
        };
      }

      return message;
    })
  );

  return processedMessages;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    // Extract taskId and currentContent from the request body
    // These are now passed with each message submission
    const taskId = body.taskId || body.body?.taskId;
    const currentContent =
      body.currentContent || body.body?.currentContent || "";

    console.log("Email edit request received for task:", taskId);
    console.log("Current content length:", currentContent.length);

    // Process any PDF attachments in messages
    const processedMessages = await processAttachments(messages);

    // Include the current email content in the system prompt
    const systemPrompt = `${emailEditPrompt}

───────────────────────────────────────────────
CURRENT EMAIL CONTENT
───────────────────────────────────────────────
${currentContent}
───────────────────────────────────────────────

Task ID: ${taskId}

PDF CONTEXT HANDLING:
═══════════════════════════════════════════════
If the user has provided a PDF document for context, use that information to:
- Better understand the brand, product, or campaign goals
- Align the email copy with the provided context and guidelines
- Reference relevant information from the PDF when making edits
- Incorporate brand voice, messaging, or specific requirements from the document
- Ask clarifying questions if the PDF context seems relevant but unclear

The PDF content is directly accessible to you - analyze it carefully and use the insights to improve the email copy.

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
      model: google("gemini-1.5-flash"),
      messages: convertToCoreMessages(processedMessages),
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
