import { tool } from "ai";
import { z } from "zod";

export const emailEditTool = tool({
  description: `Use this tool to apply modifications to email content by returning the complete updated HTML.

  EMAIL STRUCTURE:
  - Emails use HTML tables with "Section" and "Content" columns
  - Table structure: <table><thead><tr><th>Section</th><th>Content</th></tr></thead><tbody><tr><td>...</td><td>...</td></tr></tbody></table>
  - Each row in tbody represents one section of the email (e.g., HEADER, BODY, CTA, etc.)
  - Preserve all HTML classes for styling: border-collapse, border-gray-600, px-3, py-2, bg-gray-700, etc.
  
  IMPORTANT HTML STRUCTURE:
  - Table must have class="border-collapse border border-gray-600 my-4 w-full"
  - Table header cells must have class="border border-gray-600 px-3 py-2 bg-gray-700 font-semibold text-left"
  - Table body cells must have class="border border-gray-600 px-3 py-2"
  - Table rows must have class="border-b border-gray-600"
  
  You can:
  - Add, remove, or reorder sections
  - Modify section names or content
  - Apply formatting (bold, italic, links)
  - Make any structural changes needed
  
  Always return the complete, valid HTML table with all modifications applied.`,

  parameters: z.object({
    updatedHtml: z
      .string()
      .describe(
        "The complete updated HTML table with all modifications applied"
      ),
    explanation: z
      .string()
      .describe("Brief description of what changes were made (< 10 words)"),
  }),

  execute: async ({ updatedHtml, explanation }) => {
    // Validate that the HTML contains a table structure
    if (!updatedHtml.includes("<table") || !updatedHtml.includes("</table>")) {
      return {
        success: false,
        error: "Updated HTML must contain a valid table structure",
      };
    }

    return {
      success: true,
      type: "full_replacement",
      html: updatedHtml,
      explanation,
      timestamp: new Date().toISOString(),
    };
  },
});
