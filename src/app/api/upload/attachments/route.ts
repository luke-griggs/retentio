import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

// Supported file types
const ALLOWED_FILE_TYPES = {
  // Images
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  // Documents
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "application/json": [".json"],
  "text/markdown": [".md"],
  // Office documents
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check here
    // const session = await getSession();
    // if (!session) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files received" }, { status: 400 });
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Validate file type
      if (!ALLOWED_FILE_TYPES[file.type as keyof typeof ALLOWED_FILE_TYPES]) {
        return NextResponse.json(
          { error: `File type ${file.type} not allowed for ${file.name}` },
          { status: 400 }
        );
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 10MB limit` },
          { status: 400 }
        );
      }

      // Generate unique filename with user context
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(7);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const filename = `chat-attachments/${timestamp}-${randomId}-${sanitizedName}`;

      // Upload to Vercel Blob
      const blob = await put(filename, file, {
        access: "public",
        addRandomSuffix: false,
        contentType: file.type,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      // Prepare attachment metadata
      uploadedFiles.push({
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        contentType: file.type,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      attachments: uploadedFiles,
    });
  } catch (error) {
    console.error("Error uploading files to Vercel Blob:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
