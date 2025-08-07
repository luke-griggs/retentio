/**
 * Sanitizes markdown table content for ClickUp compatibility
 * Ensures that line breaks and special characters don't break table formatting
 */
export function sanitizeMarkdownForClickUp(markdownTable: string): string {
  // If it's not a table format, return as-is
  if (!markdownTable.includes('| Section | Content |')) {
    return markdownTable;
  }

  // Split into lines
  const lines = markdownTable.split('\n');
  const sanitizedLines: string[] = [];
  
  // Process each line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Keep header rows as-is
    if (i < 2) {
      sanitizedLines.push(line);
      continue;
    }
    
    // Process table data rows
    if (line.startsWith('|') && line.endsWith('|')) {
      // Split by pipe, but be careful with escaped pipes
      const parts = line.split('|').map(part => part.trim());
      
      // Skip first and last empty parts from split
      const section = parts[1] || '';
      const content = parts[2] || '';
      
      // Sanitize section and content
      const sanitizedSection = sanitizeTableCell(section);
      const sanitizedContent = sanitizeTableCell(content);
      
      // Reconstruct the row
      sanitizedLines.push(`| ${sanitizedSection} | ${sanitizedContent} |`);
    } else {
      // Non-table line, keep as-is
      sanitizedLines.push(line);
    }
  }
  
  return sanitizedLines.join('\n');
}

/**
 * Sanitizes a single table cell content
 */
function sanitizeTableCell(content: string): string {
  if (!content) {
    // Return a non-breaking space for empty cells to prevent row combining
    return ' ';
  }
  
  let sanitized = content;
  
  // Replace actual newlines with space or <br/> tag
  // ClickUp supports limited HTML in markdown, <br/> should work
  sanitized = sanitized.replace(/\n+/g, '<br/>');
  
  // Replace carriage returns
  sanitized = sanitized.replace(/\r+/g, '');
  
  // Replace tabs with spaces
  sanitized = sanitized.replace(/\t+/g, ' ');
  
  // Ensure pipe characters are properly escaped
  // But don't double-escape already escaped pipes
  sanitized = sanitized.replace(/(?<!\\)\|/g, '\\|');
  
  // Remove any zero-width spaces or other invisible characters
  sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Replace non-breaking spaces with regular spaces
  sanitized = sanitized.replace(/\u00A0/g, ' ');
  
  // Collapse multiple spaces into single space
  sanitized = sanitized.replace(/\s{2,}/g, ' ');
  
  // Trim the result
  sanitized = sanitized.trim();
  
  // If after all sanitization the cell is empty, return a space
  if (!sanitized) {
    return ' ';
  }
  
  return sanitized;
}

/**
 * Converts markdown content that might have been edited in the UI back to proper table format
 * This handles the case where the editor might have introduced line breaks within cells
 */
export function reconstructMarkdownTable(content: string): string {
  // If it doesn't look like a table, return as-is
  if (!content.includes('| Section | Content |')) {
    return content;
  }
  
  // Parse the potentially broken table
  const lines = content.split('\n');
  const rows: Array<{ section: string; content: string }> = [];
  
  let currentRow: { section: string; content: string } | null = null;
  let inTable = false;
  let headerSeen = false;
  
  for (const line of lines) {
    // Check if this is the header
    if (line.includes('| Section | Content |')) {
      inTable = true;
      headerSeen = true;
      continue;
    }
    
    // Skip the separator line
    if (headerSeen && line.includes('|---')) {
      continue;
    }
    
    if (inTable) {
      // Check if this looks like a new row (starts with |)
      if (line.startsWith('|')) {
        // Save previous row if exists
        if (currentRow) {
          rows.push(currentRow);
        }
        
        // Parse this row
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
          currentRow = {
            section: parts[1] || '',
            content: parts[2] || ''
          };
        }
      } else if (currentRow && line.trim()) {
        // This might be a continuation of the content cell
        currentRow.content += ' ' + line.trim();
      }
    }
  }
  
  // Don't forget the last row
  if (currentRow) {
    rows.push(currentRow);
  }
  
  // Rebuild the table
  const tableLines = [
    '| Section | Content |',
    '|---------|---------|'
  ];
  
  for (const row of rows) {
    const sanitizedSection = sanitizeTableCell(row.section);
    const sanitizedContent = sanitizeTableCell(row.content);
    tableLines.push(`| ${sanitizedSection} | ${sanitizedContent} |`);
  }
  
  return tableLines.join('\n');
}