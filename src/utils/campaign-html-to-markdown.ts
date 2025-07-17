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

  // Get all data rows from tbody (thead already excludes header)
  const rows = Array.from(table.querySelectorAll("tbody tr"));

  // Build the markdown table
  const markdownRows: string[] = [
    "| Section | Content |",
    "|---------|---------|",
  ];

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    if (cells.length >= 2) {
      // Extract text content from cells, preserving bold markers
      const section = extractTextWithFormatting(cells[0]);
      const content = extractTextWithFormatting(cells[1]);

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
      result += node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;

      if (el.tagName === "STRONG" || el.tagName === "B") {
        result += "**";
        Array.from(el.childNodes).forEach(processNode);
        result += "**";
      } else if (el.tagName === "EM" || el.tagName === "I") {
        result += "*";
        Array.from(el.childNodes).forEach(processNode);
        result += "*";
      } else if (el.tagName === "BR") {
        result += " ";
      } else {
        // Process child nodes for other elements
        Array.from(el.childNodes).forEach(processNode);
      }
    }
  };

  Array.from(element.childNodes).forEach(processNode);

  // Clean up whitespace
  return result.trim().replace(/\s+/g, " ");
}
