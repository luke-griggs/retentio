# Vercel Blob Storage Setup

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxx"
```

## How to Get Your Blob Token

1. Go to your Vercel Dashboard
2. Select your project
3. Go to the "Storage" tab
4. Click "Connect Store" and select "Blob"
5. Create a new Blob store or connect an existing one
6. Copy the `BLOB_READ_WRITE_TOKEN` from the environment variables

## Features

- **Automatic URL Generation**: Files are uploaded to Vercel's CDN with public URLs
- **No Local Storage**: Files are stored in the cloud, not on your server
- **Scalable**: Handles large files and high traffic
- **Secure**: Files are validated before upload
- **Organized**: Files are stored with timestamps and unique IDs

## File Structure in Blob

Files are organized as:

```
chat-attachments/
  ├── 1234567890-abc123-document.pdf
  ├── 1234567891-def456-image.png
  └── 1234567892-ghi789-spreadsheet.xlsx
```

## Supported File Types

- Images: JPG, PNG, GIF, WebP
- Documents: PDF, TXT, DOC, DOCX
- Spreadsheets: XLS, XLSX, CSV
- Data: JSON, Markdown

## File Size Limit

Maximum file size: 10MB per file
