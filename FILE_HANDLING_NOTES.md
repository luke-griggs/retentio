# File Handling in Retentio Chat

## Important: API vs Web Interface Differences

While Claude.ai (the web interface) supports many file types directly, the Anthropic API has more limited support:

### Supported by API:

- **Images**: JPG, PNG, GIF, WebP (sent as image content)
- **PDFs**: Limited support (may require special handling)

### NOT Directly Supported by API:

- CSV files
- Text files (TXT, MD)
- Office documents (DOC, DOCX, XLS, XLSX)
- JSON files

## Our Solution

We handle this limitation by:

1. **Images**: Sent directly to the API as image content
2. **Other Files**:
   - Fetched from Vercel Blob storage
   - Content read as text
   - Included in the message as text content with clear file markers

### Example:

When you upload a CSV file, it's converted to:

```
[File: data.csv]
name,age,city
John,30,New York
Jane,25,London
[End of data.csv]
```

## Benefits:

- All file types work seamlessly
- Claude can still analyze CSV, JSON, and text files
- No user-facing differences from Claude.ai
- Files stored securely in Vercel Blob

## File Size Limits:

- **Per file**: 10MB
- **Total storage**: 100GB per organization
- **Context window**: Standard Claude limits apply

## Security:

- Files validated before upload
- Stored in Vercel's secure CDN
- Public URLs but with unguessable names
