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
    const [buttonPosition, setButtonPosition] = useState<{
      top: number;
      left: number;
    } | null>(null);
    const [isAddingSection, setIsAddingSection] = useState(false);

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

        // Update button position after content changes
        updateButtonPosition();
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

    // Function to update button position based on table location
    const updateButtonPosition = () => {
      if (!editorRef.current || !editor) {
        setButtonPosition(null);
        return;
      }

      // Use a small delay to ensure DOM is updated
      setTimeout(() => {
        const editorElement = editorRef.current?.querySelector(".ProseMirror");
        if (!editorElement) return;

        const table = editorElement.querySelector("table");
        if (table) {
          const editorContainer =
            editorRef.current?.querySelector(".overflow-y-auto");
          if (!editorContainer) return;

          const containerRect = editorContainer.getBoundingClientRect();
          const tableRect = table.getBoundingClientRect();

          // Calculate position relative to the scrollable container
          const scrollTop = editorContainer.scrollTop;
          const relativeTop =
            tableRect.bottom - containerRect.top + scrollTop + 10; // 10px gap

          setButtonPosition({
            top: relativeTop,
            left: 0,
          });
        } else if (!isEmpty) {
          // If no table but has content, position at end of content
          const contentHeight = editorElement.scrollHeight;
          setButtonPosition({
            top: Math.max(contentHeight + 20, 120),
            left: 0,
          });
        } else {
          // If empty, position below placeholder
          setButtonPosition({
            top: 120,
            left: 0,
          });
        }
      }, 50);
    };

    // Function to add a new section (for the UI button)
    const addNewSection = () => {
      if (!editor || isAddingSection) return;

      setIsAddingSection(true);
      const currentHTML = editor.getHTML();
      const hasTable = currentHTML.includes("<table");

      if (hasTable) {
        // Parse current HTML and add new row
        const parser = new DOMParser();
        const doc = parser.parseFromString(currentHTML, "text/html");
        const table = doc.querySelector("table");

        if (table) {
          let tbody = table.querySelector("tbody");
          if (!tbody) {
            tbody = doc.createElement("tbody");
            table.appendChild(tbody);
          }

          // Create new row
          const newRow = doc.createElement("tr");
          newRow.className = "border-b border-gray-600";

          const sectionCell = doc.createElement("td");
          sectionCell.className = "border border-gray-600 px-3 py-2";
          sectionCell.textContent = "[section goes here]";

          const contentCell = doc.createElement("td");
          contentCell.className = "border border-gray-600 px-3 py-2";
          contentCell.textContent = "[content goes here]";

          newRow.appendChild(sectionCell);
          newRow.appendChild(contentCell);
          tbody.appendChild(newRow);

          // Update editor content
          editor.commands.setContent(doc.body.innerHTML);
        }
      } else {
        // Create new table with proper styling
        const tableHTML = `<table class="border-collapse border border-gray-600 my-4 w-full">
          <thead>
            <tr class="border-b border-gray-600">
              <th class="border border-gray-600 px-3 py-2 bg-gray-700 font-semibold text-left">Section</th>
              <th class="border border-gray-600 px-3 py-2 bg-gray-700 font-semibold text-left">Content</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-gray-600">
              <td class="border border-gray-600 px-3 py-2">[section goes here]</td>
              <td class="border border-gray-600 px-3 py-2">[content goes here]</td>
            </tr>
          </tbody>
        </table>`;

        if (editor.getText().trim().length === 0) {
          editor.commands.setContent(tableHTML);
        } else {
          editor.commands.insertContent(tableHTML);
        }

        setIsEmpty(false);
      }

      // Update button position after adding content and reset debounce
      setTimeout(() => {
        updateButtonPosition();
        setIsAddingSection(false);
      }, 200);
    };

    // Update button position when editor content or size changes
    useEffect(() => {
      if (editor) {
        updateButtonPosition();

        // Add scroll listener to update position on scroll
        const scrollContainer =
          editorRef.current?.querySelector(".overflow-y-auto");
        if (scrollContainer) {
          const handleScroll = () => updateButtonPosition();
          scrollContainer.addEventListener("scroll", handleScroll);
          return () =>
            scrollContainer.removeEventListener("scroll", handleScroll);
        }
      }
    }, [editor, content, isEmpty]);

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

          {/* Add Section Button - positioned dynamically */}
          {buttonPosition && (
            <div
              className="absolute z-10 flex justify-center w-full"
              style={{
                top: `${buttonPosition.top}px`,
                left: 0,
                paddingLeft: "24px", // Match editor padding
                paddingRight: "24px",
              }}
            >
              <button
                onClick={addNewSection}
                disabled={isAddingSection}
                className={`flex items-center gap-2 px-4 py-2 ${
                  isAddingSection
                    ? "bg-blue-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-lg transition-colors duration-200 text-sm font-medium shadow-lg`}
                title="Add new section"
              >
                {isAddingSection ? (
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                )}
                {isAddingSection ? "Adding..." : "Add Section"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);
