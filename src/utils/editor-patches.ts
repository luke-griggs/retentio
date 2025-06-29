import { Editor } from "@tiptap/core";
import { PatchOperation } from "@/app/api/tools/emailEditTool";

export interface EditorPatch {
  operations: PatchOperation[];
  targetText?: string;
}

/**
 * Apply a series of patch operations to the TipTap editor
 */
export function applyPatchesToEditor(
  editor: Editor,
  patch: EditorPatch
): boolean {
  if (!editor || !patch.operations) return false;

  const { state } = editor;
  const { doc, tr } = state;

  let currentPos = 0;

  // If we have a target text, find its position first
  if (patch.targetText) {
    const searchResult = findTextInDoc(doc, patch.targetText);
    if (!searchResult) {
      console.warn("Target text not found:", patch.targetText);
      return false;
    }
    currentPos = searchResult.from;
  }

  // Apply each operation
  patch.operations.forEach((op) => {
    switch (op.type) {
      case "retain":
        if (op.length) {
          currentPos += op.length;
        }
        break;

      case "delete":
        if (op.length) {
          tr.delete(currentPos, currentPos + op.length);
        }
        break;

      case "insert":
        if (op.value) {
          tr.insertText(op.value, currentPos);
          currentPos += op.value.length;
        }
        break;
    }
  });

  // Apply the transaction
  editor.view.dispatch(tr);
  return true;
}

/**
 * Find text position in ProseMirror document
 */
function findTextInDoc(
  doc: any,
  searchText: string
): { from: number; to: number } | null {
  let result: { from: number; to: number } | null = null;

  doc.descendants((node: any, pos: number) => {
    if (result) return false; // Stop if found

    if (node.isText) {
      const text = node.text || "";
      const index = text.indexOf(searchText);

      if (index !== -1) {
        result = {
          from: pos + index,
          to: pos + index + searchText.length,
        };
        return false; // Stop searching
      }
    }
  });

  return result;
}

/**
 * Convert a simple text replacement to patch operations
 */
export function createReplacePatches(
  currentContent: string,
  targetText: string,
  replacementText: string
): PatchOperation[] {
  const index = currentContent.indexOf(targetText);
  if (index === -1) return [];

  const operations: PatchOperation[] = [];

  // Retain everything before the target
  if (index > 0) {
    operations.push({ type: "retain", length: index });
  }

  // Delete the target text
  operations.push({ type: "delete", length: targetText.length });

  // Insert the replacement
  if (replacementText) {
    operations.push({ type: "insert", value: replacementText });
  }

  return operations;
}

/**
 * Apply streaming patches character by character for smooth animation
 */
export async function streamPatchesToEditor(
  editor: Editor,
  patches: PatchOperation[],
  onProgress?: (progress: number) => void
): Promise<void> {
  let totalChars = 0;
  let processedChars = 0;

  // Calculate total characters to process
  patches.forEach((op) => {
    if (op.type === "insert" && op.value) {
      totalChars += op.value.length;
    } else if (op.length) {
      totalChars += op.length;
    }
  });

  for (const patch of patches) {
    if (patch.type === "insert" && patch.value) {
      // Stream character by character for inserts
      for (let i = 0; i < patch.value.length; i++) {
        const char = patch.value[i];
        editor.commands.insertContent(char);

        processedChars++;
        if (onProgress) {
          onProgress(processedChars / totalChars);
        }

        // Small delay for animation effect
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    } else {
      // Apply other operations immediately
      applyPatchesToEditor(editor, { operations: [patch] });

      if (patch.length) {
        processedChars += patch.length;
        if (onProgress) {
          onProgress(processedChars / totalChars);
        }
      }
    }
  }
}
