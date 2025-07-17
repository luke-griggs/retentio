import { Node } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { Fragment, Slice } from "prosemirror-model";

export interface DraggableTableRowOptions {
  HTMLAttributes: Record<string, any>;
}

const pluginKey = new PluginKey("draggableTableRow");

export const DraggableTableRow = Node.create<DraggableTableRowOptions>({
  name: "draggableTableRow",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const { doc, selection } = state;

            doc.descendants((node, pos) => {
              if (node.type.name === "table") {
                let tablePos = pos;
                let rowIndex = 0;

                node.forEach((row, offset) => {
                  if (row.type.name === "tableRow" && rowIndex > 0) {
                    // Skip header row (index 0)
                    const rowPos = tablePos + offset + 1;
                    
                    // Find the first cell in the row
                    let firstCellPos = rowPos + 1;
                    
                    // Create drag handle decoration inside first cell
                    const handleDecoration = Decoration.widget(
                      firstCellPos,
                      () => {
                        const handle = document.createElement("div");
                        handle.className = "table-row-drag-handle";
                        handle.draggable = true;
                        handle.contentEditable = "false";
                        handle.innerHTML = `
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="4" cy="4" r="1.5"/>
                            <circle cx="12" cy="4" r="1.5"/>
                            <circle cx="4" cy="8" r="1.5"/>
                            <circle cx="12" cy="8" r="1.5"/>
                            <circle cx="4" cy="12" r="1.5"/>
                            <circle cx="12" cy="12" r="1.5"/>
                          </svg>
                        `;

                        // Add drag event handlers
                        handle.addEventListener("dragstart", (e) => {
                          e.dataTransfer!.effectAllowed = "move";
                          e.dataTransfer!.setData("text/plain", String(rowPos));
                          
                          // Store the row index for later use
                          e.dataTransfer!.setData("rowIndex", String(rowIndex));
                          
                          // Add dragging class to the row
                          const rowElement = handle.closest("tr");
                          if (rowElement) {
                            rowElement.classList.add("dragging");
                          }
                        });

                        handle.addEventListener("dragend", (e) => {
                          // Remove dragging class
                          const rowElement = handle.closest("tr");
                          if (rowElement) {
                            rowElement.classList.remove("dragging");
                          }
                          
                          // Clean up any drop zone indicators
                          document.querySelectorAll(".drop-zone-above, .drop-zone-below").forEach(el => {
                            el.classList.remove("drop-zone-above", "drop-zone-below");
                          });
                        });

                        return handle;
                      },
                      { side: -1 }
                    );

                    decorations.push(handleDecoration);
                  }
                  rowIndex++;
                });
              }
            });

            return DecorationSet.create(doc, decorations);
          },

          handleDOMEvents: {
            dragover(view, event) {
              if (!event.dataTransfer?.types.includes("text/plain")) return false;
              
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";

              // Find the closest table row
              const target = event.target as HTMLElement;
              const row = target.closest("tr");
              
              if (row && !row.closest("thead")) {
                // Remove existing drop zone classes
                document.querySelectorAll(".drop-zone-above, .drop-zone-below").forEach(el => {
                  el.classList.remove("drop-zone-above", "drop-zone-below");
                });

                // Determine if we're in the top or bottom half of the row
                const rect = row.getBoundingClientRect();
                const y = event.clientY - rect.top;
                const isTopHalf = y < rect.height / 2;

                row.classList.add(isTopHalf ? "drop-zone-above" : "drop-zone-below");
              }

              return true;
            },

            drop(view, event) {
              if (!event.dataTransfer?.types.includes("text/plain")) return false;

              event.preventDefault();

              const sourceRowPos = parseInt(event.dataTransfer.getData("text/plain"));
              const target = event.target as HTMLElement;
              const targetRow = target.closest("tr");

              if (!targetRow || targetRow.closest("thead")) return false;

              // Find the table and get row information
              const { state, dispatch } = view;
              const { doc, tr } = state;

              // Clean up drop zone classes
              document.querySelectorAll(".drop-zone-above, .drop-zone-below").forEach(el => {
                el.classList.remove("drop-zone-above", "drop-zone-below");
              });

              // Find source and target positions
              let sourceRowNode: any = null;
              let sourceRowIndex = -1;
              let targetRowIndex = -1;
              let tableNode: any = null;
              let tablePos = -1;

              doc.descendants((node, pos) => {
                if (node.type.name === "table") {
                  tableNode = node;
                  tablePos = pos;
                  let currentRowIndex = 0;

                  node.forEach((row, offset) => {
                    if (row.type.name === "tableRow") {
                      const rowPos = tablePos + offset + 1;
                      
                      if (rowPos === sourceRowPos) {
                        sourceRowNode = row;
                        sourceRowIndex = currentRowIndex;
                      }

                      // Check if this is the target row by comparing DOM elements
                      const rowElement = view.domAtPos(rowPos).node;
                      if (rowElement === targetRow || rowElement?.contains(targetRow)) {
                        targetRowIndex = currentRowIndex;
                      }

                      currentRowIndex++;
                    }
                  });
                }
              });

              if (sourceRowIndex === -1 || targetRowIndex === -1 || !sourceRowNode || !tableNode) {
                return false;
              }

              // Don't move if source and target are the same
              if (sourceRowIndex === targetRowIndex) return false;

              // Don't move header row
              if (sourceRowIndex === 0 || targetRowIndex === 0) return false;

              // Determine drop position based on drop zone
              const rect = targetRow.getBoundingClientRect();
              const y = event.clientY - rect.top;
              const insertBefore = y < rect.height / 2;
              
              let adjustedTargetIndex = targetRowIndex;
              if (!insertBefore && targetRowIndex < sourceRowIndex) {
                adjustedTargetIndex++;
              } else if (insertBefore && targetRowIndex > sourceRowIndex) {
                adjustedTargetIndex--;
              }

              // Create a new table with reordered rows
              const rows: any[] = [];
              let rowIndex = 0;

              tableNode.forEach((row: any) => {
                if (rowIndex !== sourceRowIndex) {
                  rows.push(row);
                }
                rowIndex++;
              });

              // Insert the source row at the new position
              const insertIndex = adjustedTargetIndex > sourceRowIndex 
                ? adjustedTargetIndex - 1 
                : adjustedTargetIndex;
              rows.splice(insertIndex, 0, sourceRowNode);

              // Create new table node with reordered rows
              const newTable = tableNode.type.create(
                tableNode.attrs,
                Fragment.from(rows),
                tableNode.marks
              );

              // Replace the table in the document
              tr.replaceRangeWith(tablePos, tablePos + tableNode.nodeSize, newTable);
              dispatch(tr);

              return true;
            },

            dragleave(view, event) {
              // Clean up drop zone indicators when leaving the table
              const relatedTarget = event.relatedTarget as HTMLElement;
              if (!relatedTarget?.closest("table")) {
                document.querySelectorAll(".drop-zone-above, .drop-zone-below").forEach(el => {
                  el.classList.remove("drop-zone-above", "drop-zone-below");
                });
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});