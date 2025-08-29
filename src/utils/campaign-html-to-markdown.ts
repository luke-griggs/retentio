/**
 * Converts the campaign HTML table back to the markdown format used in ClickUp
 *
 * Expected HTML structure:
 * <table>
 *   <tr><th>Section</th><th>Content</th></tr>
 *   <tr><td>**HEADER**</td><td>Header content</td></tr>
 *   <tr><td>**BODY**</td><td>Body content</td></tr>
 *   etc...
 * </table>
 */
export function campaignHtmlToMarkdown(html: string): string {
  // Create a temporary div to parse the HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Find the table element
  const table = doc.querySelector("table");
  if (!table) {
    console.warn("No table found in HTML content");
    return html; // Return original if no table found
  }

  // Get all data rows - handle both with and without tbody
  const rows = Array.from(table.querySelectorAll("tr")).filter(row => {
    // Skip header rows that contain th elements
    return row.querySelectorAll("td").length > 0;
  });

  // Always use table format to maintain consistency with AI prompts
  // The issue with ClickUp is not the table format itself, but how we handle the content
  return campaignHtmlToTableFormatWithBetterHandling(rows);
}

/**
 * Convert to structured format (non-table) for better handling of long content
 */
function campaignHtmlToStructuredFormat(rows: Element[]): string {
  const sections: string[] = [];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 2) {
      const section = extractTextWithFormatting(cells[0]);
      const content = extractTextWithFormatting(cells[1]);

      // Clean up the section name
      const cleanSection = section.replace(/\*/g, "").trim();
      
      // Format as header and content
      if (cleanSection && content.trim()) {
        // Use consistent formatting with bold headers
        sections.push(`**${cleanSection}**`);
        sections.push(content.trim());
        sections.push(""); // Empty line for spacing
      }
    }
  });

  return sections.join("\n").trim();
}

/**
 * Convert to markdown table format with better handling for ClickUp
 */
function campaignHtmlToTableFormatWithBetterHandling(rows: Element[]): string {
  // Build the markdown table
  const markdownRows: string[] = [
    "| Section | Content |",
    "|---------|---------|",
  ];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 2) {
      // Extract text content from cells, preserving bold markers
      let section = extractTextWithFormatting(cells[0]);
      let content = extractTextWithFormatting(cells[1]);

      // The text extraction should have already cleaned up newlines, but double-check
      section = section.trim();
      content = content.trim();
      
      // Additional cleanup for any missed whitespace issues
      // Replace any remaining newlines or tabs with spaces
      section = section.replace(/[\n\r\t]+/g, " ");
      content = content.replace(/[\n\r\t]+/g, " ");
      
      // Collapse multiple spaces into single spaces
      section = section.replace(/\s+/g, " ");
      content = content.replace(/\s+/g, " ");

      // For ClickUp compatibility, we need to ensure proper escaping
      // Escape backslashes first
      section = section.replace(/\\/g, "\\\\");
      content = content.replace(/\\/g, "\\\\");
      
      // Escape pipe characters to prevent table breaking
      section = section.replace(/\|/g, "\\|");
      content = content.replace(/\|/g, "\\|");
      
      // Remove any zero-width spaces or other invisible characters
      content = content.replace(/[\u200B-\u200D\uFEFF]/g, '');
      section = section.replace(/[\u200B-\u200D\uFEFF]/g, '');
      
      // Ensure no stray formatting characters
      content = content.replace(/\u00A0/g, ' '); // Replace non-breaking spaces
      section = section.replace(/\u00A0/g, ' ');
      
      // Final trim to ensure no trailing/leading spaces
      section = section.trim();
      content = content.trim();

      // Add the row to our markdown table
      markdownRows.push(`| ${section} | ${content} |`);
    }
  });

  const result = markdownRows.join("\n");
  
  // Log for debugging
  console.log("Generated markdown table:");
  console.log(result.substring(0, 500) + (result.length > 500 ? "..." : ""));
  
  return result;
}

/**
 * Convert to standard markdown table format
 */
function campaignHtmlToTableFormat(rows: Element[]): string {
  // Build the markdown table
  const markdownRows: string[] = [
    "| Section | Content |",
    "|---------|---------|",
  ];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 2) {
      // Extract text content from cells, preserving bold markers
      let section = extractTextWithFormatting(cells[0]);
      let content = extractTextWithFormatting(cells[1]);

      // Clean up whitespace and newlines for table format
      section = section.replace(/\n+/g, " ").trim();
      content = content.replace(/\n+/g, " ").trim();

      // Escape pipe characters to prevent table breaking
      section = section.replace(/\|/g, "\\|");
      content = content.replace(/\|/g, "\\|");

      // Add the row to our markdown table
      markdownRows.push(`| ${section} | ${content} |`);
    }
  });

  return markdownRows.join("\n");
}

/**
 * Extracts text content from an HTML element, preserving bold/strong formatting
 */
function extractTextWithFormatting(element: Element): string {
  let result = "";

  const processNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Check if text contains ACTION NEEDED tags and preserve them
      let text = node.textContent || "";
      // Preserve ACTION NEEDED tags that might come through as plain text
      result += text;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;

      // Check for ACTION NEEDED custom tags
      if (el.tagName === "ACTION" && el.getAttribute("NEEDED") !== null) {
        // Preserve the ACTION NEEDED tags for display
        result += `<ACTION NEEDED>${el.textContent || ""}</ACTION NEEDED>`;
      } else if (el.tagName === "STRONG" || el.tagName === "B") {
        // Check if child is EM/I for combined formatting
        const hasEmChild = Array.from(el.children).some(child => 
          child.tagName === "EM" || child.tagName === "I"
        );
        if (hasEmChild) {
          result += "**_";
          Array.from(el.childNodes).forEach(child => {
            if (child.nodeType === Node.ELEMENT_NODE && 
                ((child as Element).tagName === "EM" || (child as Element).tagName === "I")) {
              // Process the content of the em/i tag without adding extra markers
              Array.from(child.childNodes).forEach(processNode);
            } else {
              processNode(child);
            }
          });
          result += "_**";
        } else {
          result += "**";
          Array.from(el.childNodes).forEach(processNode);
          result += "**";
        }
      } else if (el.tagName === "EM" || el.tagName === "I") {
        // Skip if parent is already STRONG/B (handled above)
        const parent = el.parentElement;
        if (parent && (parent.tagName === "STRONG" || parent.tagName === "B")) {
          Array.from(el.childNodes).forEach(processNode);
        } else {
          result += "*";
          Array.from(el.childNodes).forEach(processNode);
          result += "*";
        }
      } else if (el.tagName === "A") {
        // Handle links - convert HTML links to markdown format
        const href = el.getAttribute("href");
        const linkText = el.textContent || "";
        if (href) {
          result += `[${linkText}](${href})`;
        } else {
          result += linkText;
        }
      } else if (el.tagName === "BR") {
        // Preserve line breaks
        result += "\n";
      } else if (el.tagName === "P" || el.tagName === "DIV") {
        // Add line breaks for block elements
        if (result.length > 0 && !result.endsWith("\n")) {
          result += "\n";
        }
        Array.from(el.childNodes).forEach(processNode);
        if (!result.endsWith("\n")) {
          result += "\n";
        }
      } else {
        // Process child nodes for other elements
        Array.from(el.childNodes).forEach(processNode);
      }
    }
  };

  Array.from(element.childNodes).forEach(processNode);

  // Clean up whitespace more carefully
  // First trim the entire result
  result = result.trim();
  
  // Handle escaped ACTION NEEDED tags - convert them back to proper format
  // This handles cases where the tags come through as &lt;ACTION NEEDED&gt;
  result = result.replace(/&lt;ACTION NEEDED&gt;(.*?)&lt;\/ACTION NEEDED&gt;/gi, '<ACTION NEEDED>$1</ACTION NEEDED>');
  
  // Replace multiple spaces/tabs with single space, but keep newlines
  result = result.replace(/[^\S\n]+/g, " ");
  
  // Remove trailing spaces from each line
  result = result.replace(/ +$/gm, "");
  
  // Replace multiple newlines with single space for table compatibility
  // This is crucial - tables can't have newlines in cells
  result = result.replace(/\n+/g, " ");
  
  // Final trim to ensure no leading/trailing spaces
  return result.trim();
}