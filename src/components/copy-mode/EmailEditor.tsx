"use client";

import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Typography from "@tiptap/extension-typography";

import Link from "@tiptap/extension-link";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import "./email-editor.css";
import { applyPatchesToEditor, EditorPatch } from "@/utils/editor-patches";

interface EmailEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export interface EmailEditorRef {
  editor: Editor | null;
  applyPatch: (patch: EditorPatch) => boolean;
  getContent: () => string;
  setContent: (content: string) => void;
}

// Convert markdown table to HTML table
const convertMarkdownTableToHtml = (markdown: string): string => {
  console.log("Converting markdown:", markdown);

  // Check if this looks like our table format
  if (markdown.includes("| Section | Content |") && markdown.includes("|")) {
    console.log("Detected table format");

    // Split by | and filter out empty parts and separators
    const parts = markdown
      .split("|")
      .map((part) => part.trim())
      .filter((part) => part && part !== "---");

    console.log("Split parts:", parts);

    // Find the start of actual data (after "Section" and "Content" headers)
    let dataStartIndex = -1;
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i] === "Section" && parts[i + 1] === "Content") {
        dataStartIndex = i + 2;
        break;
      }
    }

    if (dataStartIndex === -1) {
      console.log("Could not find data start");
      return markdown;
    }

    // Extract section/content pairs
    const sections = [];
    for (let i = dataStartIndex; i < parts.length - 1; i += 2) {
      const section = parts[i];
      const content = parts[i + 1];

      if (section && content) {
        sections.push({ section, content });
      }
    }

    console.log("Extracted sections:", sections);

    if (sections.length > 0) {
      let html =
        "<table><thead><tr><th>Section</th><th>Content</th></tr></thead><tbody>";

      sections.forEach(({ section, content }) => {
        // Handle markdown formatting within cells
        const formattedSection = section
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/`(.+?)`/g, "<code>$1</code>");

        const formattedContent = content
          .replace(/\*\*_(.+?)_\*\*/g, "<strong><em>$1</em></strong>")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/`(.+?)`/g, "<code>$1</code>");

        html += `<tr><td>${formattedSection}</td><td>${formattedContent}</td></tr>`;
      });

      html += "</tbody></table>";
      console.log("Generated HTML:", html);
      return html;
    }
  }

  // Fallback to original content if parsing fails
  console.log("No table detected, returning original");
  return markdown;
};

export default forwardRef<EmailEditorRef, EmailEditorProps>(
  function EmailEditor({ content, onChange }: EmailEditorProps, ref) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3, 4, 5, 6],
          },
          code: {
            HTMLAttributes: {
              class:
                "bg-gray-700/50 text-yellow-300 px-1 py-0.5 rounded text-sm",
            },
          },
          codeBlock: {
            HTMLAttributes: {
              class: "bg-gray-700/50 p-3 rounded my-2 overflow-x-auto",
            },
          },
          blockquote: {
            HTMLAttributes: {
              class:
                "border-l-4 border-gray-500 pl-4 my-2 text-gray-300 italic",
            },
          },
          bulletList: {
            HTMLAttributes: {
              class: "my-2",
            },
          },
          orderedList: {
            HTMLAttributes: {
              class: "my-2",
            },
          },
        }),
        Typography,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-blue-400 underline hover:text-blue-300",
          },
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: {
            class: "border-collapse border border-gray-600 my-4 w-full",
          },
        }),
        TableRow.configure({
          HTMLAttributes: {
            class: "border-b border-gray-600",
          },
        }),
        TableHeader.configure({
          HTMLAttributes: {
            class:
              "border border-gray-600 px-3 py-2 bg-gray-700 font-semibold text-left",
          },
        }),
        TableCell.configure({
          HTMLAttributes: {
            class: "border border-gray-600 px-3 py-2",
          },
        }),
      ],
      content: "",
      editorProps: {
        attributes: {
          class:
            "prose prose-invert prose-sm max-w-none focus:outline-none p-6 h-full text-gray-100",
          style: "min-height: 100%; line-height: 1.6;",
        },
      },
      onUpdate: ({ editor }) => {
        // Get HTML content instead of markdown for emails
        const html = editor.getHTML();
        onChange(html);

        // Update isEmpty state
        const text = editor.getText().trim();
        setIsEmpty(text.length === 0);
      },
      onFocus: () => {
        // Hide placeholder on focus if editor is empty
        if (isEmpty) {
          setIsEmpty(false);
        }
      },
      onBlur: ({ editor }) => {
        // Show placeholder again if editor is empty after blur
        const text = editor.getText().trim();
        setIsEmpty(text.length === 0);
      },
      parseOptions: {
        preserveWhitespace: "full",
      },
    });

    // Expose editor methods via ref
    useImperativeHandle(
      ref,
      () => ({
        editor,
        applyPatch: (patch: EditorPatch) => {
          if (!editor) return false;
          return applyPatchesToEditor(editor, patch);
        },
        getContent: () => editor?.getHTML() || "",
        setContent: (newContent: string) => {
          if (editor) {
            editor.commands.setContent(newContent);
          }
        },
      }),
      [editor]
    );

    // Update editor content when content prop changes
    useEffect(() => {
      if (editor) {
        if (content && content.trim().length > 0) {
          // Convert markdown content to HTML if it contains tables
          const htmlContent = convertMarkdownTableToHtml(content);

          // Only update if content is different
          if (htmlContent !== editor.getHTML()) {
            editor.commands.setContent(htmlContent, false);
          }
          setIsEmpty(false);
        } else {
          // Clear content to show placeholder
          editor.commands.setContent("", false);
          setIsEmpty(true);
        }
      }
    }, [content, editor]);

    // Handle toolbar commands
    useEffect(() => {
      const handleFormatText = (event: CustomEvent) => {
        if (!editor) return;

        const { format } = event.detail;

        switch (format) {
          case "h1":
            editor.chain().focus().toggleHeading({ level: 1 }).run();
            break;
          case "h2":
            editor.chain().focus().toggleHeading({ level: 2 }).run();
            break;
          case "h3":
            editor.chain().focus().toggleHeading({ level: 3 }).run();
            break;
          case "bold":
            editor.chain().focus().toggleBold().run();
            break;
          case "italic":
            editor.chain().focus().toggleItalic().run();
            break;
          case "bullet":
            editor.chain().focus().toggleBulletList().run();
            break;
          case "numbered":
            editor.chain().focus().toggleOrderedList().run();
            break;
          case "quote":
            editor.chain().focus().toggleBlockquote().run();
            break;
          case "code":
            editor.chain().focus().toggleCode().run();
            break;
          case "link":
            const url = window.prompt("Enter URL:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
            break;
          case "table":
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run();
            break;
          default:
            break;
        }
      };

      window.document.addEventListener(
        "formatText",
        handleFormatText as EventListener
      );

      return () => {
        window.document.removeEventListener(
          "formatText",
          handleFormatText as EventListener
        );
      };
    }, [editor]);

    if (!editor) {
      return (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <p>Loading editor...</p>
        </div>
      );
    }

    return (
      <div className="flex-1 flex relative overflow-hidden">
        <div className="flex-1 relative" ref={editorRef}>
          <EditorContent editor={editor} className="h-full overflow-y-auto" />

          {/* Custom placeholder overlay */}
          {isEmpty && (
            <div
              className="absolute top-6 left-6 text-gray-400 cursor-text select-none"
              style={{ fontSize: "14px", lineHeight: "1.6" }}
              onClick={() => editor?.commands.focus()}
            >
              This campaign has no content. Start typing to add email content...
            </div>
          )}
        </div>
      </div>
    );
  }
);
