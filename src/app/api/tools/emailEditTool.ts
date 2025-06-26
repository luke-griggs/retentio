import { tool } from "ai";
import { z } from "zod";

// Patch operation types similar to OT/CRDT systems
export interface PatchOperation {
  type: "retain" | "delete" | "insert";
  value?: string; // For insert operations
  length?: number; // For retain/delete operations
}

export const emailEditTool = tool({
  description: `Use this tool to apply modifications to email content. 
  The tool returns patch operations that can be applied directly to the editor.
  Be precise with the target text to ensure accurate replacements.`,

  parameters: z.object({
    action: z
      .enum(["replace", "insert", "delete", "patch"])
      .describe(
        "The type of modification to make. Use 'patch' for complex multi-part edits"
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
  }),

  execute: async ({
    action,
    target,
    replacement,
    position,
    patches,
    explanation,
  }) => {
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
