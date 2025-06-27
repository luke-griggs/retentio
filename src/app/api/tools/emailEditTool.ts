import { tool } from "ai";
import { z } from "zod";

// Patch operation types similar to OT/CRDT systems
export interface PatchOperation {
  type: "retain" | "delete" | "insert";
  value?: string; // For insert operations
  length?: number; // For retain/delete operations
}

export const emailEditTool = tool({
  description: `Use this tool to apply modifications to email content structured as HTML tables with sections.

  EMAIL STRUCTURE:
  - Emails use HTML tables with "Section" and "Content" columns
  - Each row represents one section of the email
  - Table structure: <table><thead><tr><th>Section</th><th>Content</th></tr></thead><tbody><tr><td>...</td><td>...</td></tr></tbody></table>

  SECTION OPERATIONS (PREFERRED):
  Use these semantic actions for reliable table operations:
  
  - action: "add_section" - Add a new section row
    Parameters: section_name, section_content, section_position ("start"|"end"|"after"|"before"), target_section
    
  - action: "remove_section" - Remove an entire section
    Parameters: section_name
    
  - action: "move_section" - Reposition an existing section  
    Parameters: section_name, section_position, target_section
    
  - action: "update_section_name" - Change a section's name
    Parameters: section_name, new_section_name
    
  - action: "update_section_content" - Change a section's content
    Parameters: section_name, section_content

  LEGACY TEXT OPERATIONS:
  - action: "replace", "insert", "delete" - For precise text modifications
  - Require exact target text matching

  The tool returns patch operations that can be applied directly to the editor.
  Always preserve the HTML table structure and CSS classes when making changes.`,

  parameters: z.object({
    action: z
      .enum([
        "replace",
        "insert",
        "delete",
        "patch",
        "add_section",
        "remove_section",
        "move_section",
        "update_section_name",
        "update_section_content",
      ])
      .describe(
        "The type of modification to make. Use 'patch' for complex multi-part edits, or table-specific actions for section operations"
      ),
    target: z
      .string()
      .optional()
      .describe(
        "The exact text to find in the email. Required for replace/insert/delete actions."
      ),
    replacement: z
      .string()
      .optional()
      .describe(
        "The new content for replace/insert actions. Required for replace and insert actions."
      ),
    position: z
      .enum(["before", "after"])
      .optional()
      .describe(
        "Where to insert content relative to the target. Only used for insert actions."
      ),
    patches: z
      .array(
        z.object({
          type: z.enum(["retain", "delete", "insert"]),
          value: z.string().optional(),
          length: z.number().optional(),
        })
      )
      .optional()
      .describe("Array of patch operations for streaming changes"),
    explanation: z
      .string()
      .describe("brief past tense explanation of the change made: < 10 words"),
    // Table/Section-specific parameters
    section_name: z
      .string()
      .optional()
      .describe(
        "Name of the section for section-specific operations (e.g., 'HEADER', 'BODY', 'CTA')"
      ),
    section_content: z
      .string()
      .optional()
      .describe("Content for the section when adding or updating"),
    new_section_name: z
      .string()
      .optional()
      .describe("New name when updating a section name"),
    section_position: z
      .enum(["start", "end", "after", "before"])
      .optional()
      .describe(
        "Where to place the section: 'start', 'end', or relative to another section"
      ),
    target_section: z
      .string()
      .optional()
      .describe(
        "Reference section name when using 'after' or 'before' positioning"
      ),
  }),

  execute: async ({
    action,
    target,
    replacement,
    position,
    patches,
    explanation,
    section_name,
    section_content,
    new_section_name,
    section_position = "end",
    target_section,
  }) => {
    // Handle section-specific operations
    if (action === "add_section") {
      if (!section_name || !section_content) {
        return {
          error:
            "section_name and section_content are required for add_section",
          success: false,
        };
      }

      return {
        success: true,
        type: "section_operation",
        operation: {
          action: "add_section",
          section_name,
          section_content,
          position: section_position,
          target_section,
          explanation,
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (action === "remove_section") {
      if (!section_name) {
        return {
          error: "section_name is required for remove_section",
          success: false,
        };
      }

      return {
        success: true,
        type: "section_operation",
        operation: {
          action: "remove_section",
          section_name,
          explanation,
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (action === "move_section") {
      if (!section_name) {
        return {
          error: "section_name is required for move_section",
          success: false,
        };
      }

      return {
        success: true,
        type: "section_operation",
        operation: {
          action: "move_section",
          section_name,
          position: section_position,
          target_section,
          explanation,
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (action === "update_section_name") {
      if (!section_name || !new_section_name) {
        return {
          error:
            "section_name and new_section_name are required for update_section_name",
          success: false,
        };
      }

      return {
        success: true,
        type: "section_operation",
        operation: {
          action: "update_section_name",
          section_name,
          new_section_name,
          explanation,
          timestamp: new Date().toISOString(),
        },
      };
    }

    if (action === "update_section_content") {
      if (!section_name || !section_content) {
        return {
          error:
            "section_name and section_content are required for update_section_content",
          success: false,
        };
      }

      return {
        success: true,
        type: "section_operation",
        operation: {
          action: "update_section_content",
          section_name,
          section_content,
          explanation,
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Handle patch-based operations for streaming
    if (action === "patch" && patches) {
      return {
        success: true,
        type: "patch",
        patches,
        explanation,
        timestamp: new Date().toISOString(),
      };
    }

    // Validate standard operations
    if ((action === "replace" || action === "insert") && !replacement) {
      return {
        error: "Replacement text is required for replace and insert actions",
        success: false,
      };
    }

    if (action === "insert" && !position) {
      return {
        error: "Position (before/after) is required for insert actions",
        success: false,
      };
    }

    if (!target && action !== "patch") {
      return {
        error: "Target text is required for non-patch actions",
        success: false,
      };
    }

    // Convert standard operations to patch format for unified handling
    const convertToPatch = () => {
      if (!target) return [];

      const targetLength = target.length;

      switch (action) {
        case "replace":
          return [
            { type: "delete" as const, length: targetLength },
            { type: "insert" as const, value: replacement || "" },
          ];
        case "insert":
          if (position === "before") {
            return [{ type: "insert" as const, value: replacement || "" }];
          } else {
            return [
              { type: "retain" as const, length: targetLength },
              { type: "insert" as const, value: replacement || "" },
            ];
          }
        case "delete":
          return [{ type: "delete" as const, length: targetLength }];
        default:
          return [];
      }
    };

    return {
      success: true,
      type: "operation",
      operation: {
        action,
        target,
        replacement: replacement || "",
        position: position || "after",
        patches: convertToPatch(),
        explanation,
        timestamp: new Date().toISOString(),
      },
    };
  },
});
