"use client";

import React, { useState, useEffect, useRef } from "react";
import { Reorder, useDragControls } from "framer-motion";
import {
  parseMarkdownTable,
  serializeToMarkdown,
  updateRow,
  reorderRows,
  addRow,
  removeRow,
  createNewRow,
  type TableRow,
  type ParsedEmailTable,
} from "@/utils/email-table-parser";
import { campaignHtmlToMarkdown } from "@/utils/campaign-html-to-markdown";

interface DraggableEmailTableProps {
  content: string;
  onChange: (content: string) => void;
}

export interface DraggableEmailTableRef {
  editor: {
    getHTML: () => string;
    commands: {
      setContent: (content: string) => void;
    };
  } | null;
  getContent: () => string;
  setContent: (content: string) => void;
}

// Separate component for each draggable row
const DraggableRow = ({
  row,
  index,
  totalRows,
  editingCell,
  onCellEdit,
  onCellUpdate,
  onCellCancel,
  onRemove,
}: {
  row: TableRow;
  index: number;
  totalRows: number;
  editingCell: { rowId: string; field: "section" | "content" } | null;
  onCellEdit: (rowId: string, field: "section" | "content") => void;
  onCellUpdate: (value: string) => void;
  onCellCancel: () => void;
  onRemove: (rowId: string) => void;
}) => {
  const controls = useDragControls();
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      const textarea = editInputRef.current;
      // Set initial height to match content first
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
      textarea.focus();
      // Place cursor at end instead of selecting all text
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, [editingCell]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onCellUpdate(e.currentTarget.textContent || "");
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCellCancel();
    }
  };

  return (
    <Reorder.Item
      key={row.id}
      value={row}
      dragListener={false}
      dragControls={controls}
      className="bg-gray-800 border-l border-r border-gray-600 hover:bg-gray-750 transition-colors group"
      style={{
        borderBottom: index === totalRows - 1 ? "1px solid #4b5563" : "none",
        borderTop: "1px solid #4b5563",
      }}
    >
      <div className="grid grid-cols-[200px_1fr] relative">
        {/* Drag Handle */}
        <div
          className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          onPointerDown={(e) => controls.start(e)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="text-gray-400 hover:text-gray-300"
          >
            <circle cx="4" cy="4" r="1.5" />
            <circle cx="12" cy="4" r="1.5" />
            <circle cx="4" cy="8" r="1.5" />
            <circle cx="12" cy="8" r="1.5" />
            <circle cx="4" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
          </svg>
        </div>

        {/* Section Cell */}
        <div className="border-r border-gray-600 pl-8 pr-4 py-3">
          {editingCell?.rowId === row.id && editingCell?.field === "section" ? (
            <textarea
              ref={editInputRef}
              defaultValue={row.section}
              className="w-full bg-transparent text-white resize-none border-none outline-none min-h-[1.5rem] leading-6 p-0 m-0"
              style={{
                height: "auto",
                fontFamily: "inherit",
                fontSize: "inherit",
                lineHeight: "1.5",
                padding: "0",
                margin: "0",
                border: "none",
                overflow: "hidden",
              }}
              onBlur={(e) => onCellUpdate(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />
          ) : (
            <div
              className="text-white cursor-text min-h-[1.5rem] whitespace-pre-wrap leading-6"
              onClick={() => onCellEdit(row.id, "section")}
              dangerouslySetInnerHTML={{
                __html: row.section
                  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\*(.+?)\*/g, "<em>$1</em>")
                  .replace(
                    /`(.+?)`/g,
                    "<code class='bg-gray-700 px-1 rounded'>$1</code>"
                  ),
              }}
            />
          )}
        </div>

        {/* Content Cell */}
        <div className="px-4 py-3 relative">
          {editingCell?.rowId === row.id && editingCell?.field === "content" ? (
            <textarea
              ref={editInputRef}
              defaultValue={row.content}
              className="w-full bg-transparent text-white resize-none border-none outline-none min-h-[1.5rem] leading-6 p-0 m-0"
              style={{
                height: "auto",
                fontFamily: "inherit",
                fontSize: "inherit",
                lineHeight: "1.5",
                padding: "0",
                margin: "0",
                border: "none",
                overflow: "hidden",
              }}
              onBlur={(e) => onCellUpdate(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = target.scrollHeight + "px";
              }}
            />
          ) : (
            <div
              className="text-white cursor-text min-h-[1.5rem] whitespace-pre-wrap leading-6"
              onClick={() => onCellEdit(row.id, "content")}
              dangerouslySetInnerHTML={{
                __html: row.content
                  .replace(/\*\*_(.+?)_\*\*/g, "<strong><em>$1</em></strong>")
                  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\*(.+?)\*/g, "<em>$1</em>")
                  .replace(
                    /`(.+?)`/g,
                    "<code class='bg-gray-700 px-1 rounded'>$1</code>"
                  )
                  // Handle numbered lists
                  .replace(
                    /(?:^|\n)((?:\d+\.\s+.+(?:\n|$))+)/g,
                    (match, listContent) => {
                      const items = listContent.trim().split(/\n(?=\d+\.)/);
                      const listItems = items
                        .map((item: string) => {
                          const text = item.replace(/^\d+\.\s+/, "").trim();
                          return `<li>${text}</li>`;
                        })
                        .join("");
                      return `<ol class="list-decimal list-inside my-2">${listItems}</ol>`;
                    }
                  )
                  // Handle bullet lists
                  .replace(
                    /(?:^|\n)((?:[•\-\*]\s+.+(?:\n|$))+)/g,
                    (match, listContent) => {
                      const items = listContent.trim().split(/\n(?=[•\-\*])/);
                      const listItems = items
                        .map((item: string) => {
                          const text = item.replace(/^[•\-\*]\s+/, "").trim();
                          return `<li>${text}</li>`;
                        })
                        .join("");
                      return `<ul class="list-disc list-inside my-2">${listItems}</ul>`;
                    }
                  ),
              }}
            />
          )}

          {/* Delete button (appears on hover) */}
          {totalRows > 1 && (
            <button
              onClick={() => onRemove(row.id)}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400"
              title="Delete row"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
};

const DraggableEmailTable = React.forwardRef<
  DraggableEmailTableRef,
  DraggableEmailTableProps
>(({ content, onChange }, ref) => {
  // Initialize table state from content prop (only on mount)
  const [table, setTable] = useState<ParsedEmailTable>(() => {
    const parsed = parseMarkdownTable(content);
    return parsed;
  });
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    field: "section" | "content";
  } | null>(null);
  const [isEmpty, setIsEmpty] = useState(() => {
    const parsed = parseMarkdownTable(content);
    return parsed.rows.length === 0;
  });

  // Update table state when content prop changes (e.g., when switching campaigns)
  useEffect(() => {
    const parsed = parseMarkdownTable(content);
    setTable(parsed);
    setIsEmpty(parsed.rows.length === 0);
    // Clear any active editing when content changes
    setEditingCell(null);
  }, [content]);

  // Helper function to handle table changes (triggers onChange for user interactions)
  const handleTableChange = (newTable: ParsedEmailTable) => {
    setTable(newTable);
    setIsEmpty(newTable.rows.length === 0);
    const markdown = serializeToMarkdown(newTable);
    onChange(markdown);
  };

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    editor: {
      getHTML: () => serializeToMarkdown(table),
      commands: {
        setContent: (newContent: string) => {
          console.log("AI setContent called with:", newContent);

          // Check if content is HTML (contains table tags) and convert to markdown
          let contentToUse = newContent;
          if (newContent.includes("<table") || newContent.includes("<tr")) {
            console.log("Converting HTML to markdown");
            contentToUse = campaignHtmlToMarkdown(newContent);
            console.log("Converted to markdown:", contentToUse);
          }

          const parsed = parseMarkdownTable(contentToUse);
          console.log("Parsed table:", parsed);
          const newTable = { rows: parsed.rows };
          handleTableChange(newTable); // Use handleTableChange to trigger onChange
        },
      },
    },
    getContent: () => serializeToMarkdown(table),
    setContent: (newContent: string) => {
      console.log("Direct setContent called with:", newContent);

      // Check if content is HTML (contains table tags) and convert to markdown
      let contentToUse = newContent;
      if (newContent.includes("<table") || newContent.includes("<tr")) {
        console.log("Converting HTML to markdown");
        contentToUse = campaignHtmlToMarkdown(newContent);
        console.log("Converted to markdown:", contentToUse);
      }

      const parsed = parseMarkdownTable(contentToUse);
      console.log("Parsed table:", parsed);
      const newTable = { rows: parsed.rows };
      handleTableChange(newTable); // Use handleTableChange to trigger onChange
    },
  }));

  const handleReorder = (newOrder: TableRow[]) => {
    const reorderedTable = reorderRows(table, newOrder);
    handleTableChange(reorderedTable);
  };

  const handleCellEdit = (rowId: string, field: "section" | "content") => {
    setEditingCell({ rowId, field });
  };

  const handleCellUpdate = (value: string) => {
    if (!editingCell) return;

    const updatedTable = updateRow(table, editingCell.rowId, {
      [editingCell.field]: value,
    });
    handleTableChange(updatedTable);
    setEditingCell(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const addNewSection = () => {
    const newTable = addRow(table);
    handleTableChange(newTable);
  };

  const removeSection = (rowId: string) => {
    const newTable = removeRow(table, rowId);
    handleTableChange(newTable);
  };

  if (isEmpty) {
    return (
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div className="flex-1 flex items-center justify-center text-gray-400 p-6">
          <div className="text-center">
            <p className="mb-4">
              This campaign has no content. Start by adding email content...
            </p>
            <button
              onClick={addNewSection}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
            >
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
              Add Section
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        {/* Table Header */}
        <div className="mb-4">
          <div className="grid grid-cols-[200px_1fr] bg-gray-700 border border-gray-600 rounded-lg text-center">
            <div className="px-4 py-3 font-semibold text-white border-r border-gray-600">
              Section
            </div>
            <div className="px-4 py-3 font-semibold text-white">Content</div>
          </div>
        </div>

        {/* Reorderable Table Rows */}
        <Reorder.Group
          axis="y"
          values={table.rows}
          onReorder={handleReorder}
          className="space-y-0"
        >
          {table.rows.map((row, index) => (
            <DraggableRow
              key={row.id}
              row={row}
              index={index}
              totalRows={table.rows.length}
              editingCell={editingCell}
              onCellEdit={handleCellEdit}
              onCellUpdate={handleCellUpdate}
              onCellCancel={handleCellCancel}
              onRemove={removeSection}
            />
          ))}
        </Reorder.Group>

        {/* Add Section Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={addNewSection}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium shadow-lg"
          >
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
            Add Section
          </button>
        </div>
      </div>
    </div>
  );
});

DraggableEmailTable.displayName = "DraggableEmailTable";

export default DraggableEmailTable;
