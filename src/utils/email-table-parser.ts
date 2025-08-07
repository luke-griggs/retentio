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

  // Split by | and filter out empty parts and separators
  const parts = markdown
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && !part.match(/^-+$/)); // Filter out any string that's only dashes

  // Find the start of actual data (after "Section" and "Content" headers)
  let dataStartIndex = -1;
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === "Section" && parts[i + 1] === "Content") {
      dataStartIndex = i + 2;
      break;
    }
  }

  if (dataStartIndex === -1) {
    return { rows };
  }

  // Extract section/content pairs
  for (let i = dataStartIndex; i < parts.length - 1; i += 2) {
    const section = parts[i];
    const content = parts[i + 1] || ""; // Default to empty string if undefined

    // Allow rows with empty content, but section must exist
    if (section) {
      rows.push({
        id: `row-${Date.now()}-${i}`, // Generate unique ID
        section: section.trim(),
        content: content.trim(),
      });
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
    id: `row-${Date.now()}-${Math.random()}`,
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