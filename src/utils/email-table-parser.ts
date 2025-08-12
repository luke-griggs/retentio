export interface TableRow {
  id: string;
  section: string;
  content: string;
}

export interface ParsedEmailTable {
  rows: TableRow[];
}

/**
 * Parses markdown table format into structured data
 * Expected format:
 * | Section | Content |
 * |---------|---------|
 * | SUBJECT LINE | Email subject content |
 * | BODY | Email body content |
 */
export function parseMarkdownTable(markdown: string): ParsedEmailTable {
  const rows: TableRow[] = [];

  // Check if this looks like our table format
  if (!markdown.includes("| Section | Content |") || !markdown.includes("|")) {
    return { rows };
  }

  // Split into lines for more accurate parsing
  const lines = markdown.split('\n');
  
  let inTable = false;
  let headerSeen = false;
  
  let rowIndex = 0;
  for (const line of lines) {
    // Check for header
    if (line.includes('| Section | Content |')) {
      inTable = true;
      headerSeen = true;
      continue;
    }
    
    // Skip separator line (various formats)
    if (headerSeen && (line.includes('|---') || line.match(/^\s*\|\s*-+\s*\|\s*-+\s*\|\s*$/))) {
      continue;
    }
    
    // Parse data rows
    if (inTable && line.startsWith('|') && line.endsWith('|')) {
      // Remove leading and trailing pipes
      const trimmedLine = line.substring(1, line.length - 1);
      
      // Find the first pipe to separate section from content
      // This correctly handles empty content cells
      const pipeIndex = trimmedLine.indexOf('|');
      
      if (pipeIndex !== -1) {
        const section = trimmedLine.substring(0, pipeIndex).trim();
        const content = trimmedLine.substring(pipeIndex + 1).trim();
        
        // Skip rows that are just separators (containing only dashes)
        if (section.match(/^-+$/) && content.match(/^-*$/)) {
          continue;
        }
        
        // Only add if section exists (even if content is empty)
        if (section) {
          rows.push({
            id: `row-${Date.now()}-${rowIndex++}-${Math.random().toString(36).substr(2, 9)}`,
            section: section,
            content: content || "", // Ensure empty string for empty content
          });
        }
      }
    }
  }

  return { rows };
}

/**
 * Converts structured table data back to markdown format
 */
export function serializeToMarkdown(table: ParsedEmailTable): string {
  if (table.rows.length === 0) {
    return "";
  }

  const markdownRows: string[] = [
    "| Section | Content |",
    "|---------|---------|",
  ];

  table.rows.forEach((row) => {
    // Escape special characters for markdown table cells
    let section = row.section;
    let content = row.content;
    
    // Replace newlines with spaces to prevent table breaking
    section = section.replace(/[\n\r]+/g, " ");
    content = content.replace(/[\n\r]+/g, " ");
    
    // Escape pipe characters
    section = section.replace(/\|/g, "\\|");
    content = content.replace(/\|/g, "\\|");
    
    // Trim excess whitespace
    section = section.trim();
    content = content.trim();
    
    // If content is empty, use a space to prevent row combining
    if (!content) {
      content = " ";
    }
    
    markdownRows.push(`| ${section} | ${content} |`);
  });

  return markdownRows.join("\n");
}

/**
 * Creates a new empty row
 */
export function createNewRow(): TableRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    section: "[section goes here]",
    content: "[content goes here]",
  };
}

/**
 * Updates a specific row in the table
 */
export function updateRow(
  table: ParsedEmailTable,
  rowId: string,
  updates: Partial<Pick<TableRow, "section" | "content">>
): ParsedEmailTable {
  return {
    ...table,
    rows: table.rows.map((row) =>
      row.id === rowId ? { ...row, ...updates } : row
    ),
  };
}

/**
 * Reorders rows in the table
 */
export function reorderRows(
  table: ParsedEmailTable,
  newOrder: TableRow[]
): ParsedEmailTable {
  return {
    ...table,
    rows: newOrder,
  };
}

/**
 * Adds a new row to the table
 */
export function addRow(table: ParsedEmailTable, newRow?: TableRow): ParsedEmailTable {
  const row = newRow || createNewRow();
  return {
    ...table,
    rows: [...table.rows, row],
  };
}

/**
 * Removes a row from the table
 */
export function removeRow(table: ParsedEmailTable, rowId: string): ParsedEmailTable {
  return {
    ...table,
    rows: table.rows.filter((row) => row.id !== rowId),
  };
}