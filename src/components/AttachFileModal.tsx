"use client";

import { useState, useRef } from "react";

interface AttachFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileAttach: (file: File, fileUrl: string) => void;
}

const ACCEPTED_FILE_TYPES = {
  "image/*": ["jpg", "jpeg", "png", "gif", "webp"],
  "application/pdf": ["pdf"],
  "text/plain": ["txt"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "text/csv": ["csv"],
  "application/json": ["json"],
  "text/markdown": ["md"],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function AttachFileModal({
  isOpen,
  onClose,
  onFileAttach,
}: AttachFileModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      alert("File size must be less than 10MB");
      return;
    }

    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();
    const isValidType = Object.values(ACCEPTED_FILE_TYPES)
      .flat()
      .includes(fileExtension || "");

    if (isValidType) {
      setFile(selectedFile);
    } else {
      alert(
        "Please select a supported file type (images, PDF, TXT, DOC, DOCX, XLS, XLSX, CSV, JSON, MD)"
      );
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleAttach = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file); // Note: using 'files' to match new endpoint

      const response = await fetch("/api/upload/attachments", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // The new endpoint returns an array of attachments
        if (data.attachments && data.attachments.length > 0) {
          const attachment = data.attachments[0];
          onFileAttach(file, attachment.url);
          setFile(null);
          onClose();
        }
      } else {
        const error = await response.json();
        alert(error.error || "Upload failed. Please try again.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setIsDragging(false);
    onClose();
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
        </svg>
      );
    }

    if (extension === "pdf") {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      );
    }

    return (
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl p-6 w-full max-w-md mx-4 border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Attach File</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
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
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept={Object.keys(ACCEPTED_FILE_TYPES).join(",")}
              onChange={handleFileSelect}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`w-full px-4 py-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-yellow-400 bg-yellow-400/10 text-yellow-300"
                  : file
                  ? "border-green-500 bg-green-500/10 text-green-300"
                  : "border-slate-600 text-gray-300 hover:border-slate-500 hover:text-white"
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                {file ? (
                  <div
                    className={`${file ? "text-green-400" : "text-gray-400"}`}
                  >
                    {getFileIcon(file.name)}
                  </div>
                ) : (
                  <svg
                    className={`w-8 h-8 ${
                      isDragging ? "text-yellow-400" : "text-gray-400"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                    />
                  </svg>
                )}
                <div>
                  {isDragging ? (
                    <p className="text-sm font-medium">Drop your file here</p>
                  ) : file ? (
                    <>
                      <p className="text-sm font-medium text-green-300">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Click to
                        change
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-xs text-gray-400">
                        Images, PDFs, documents up to 10MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAttach}
              disabled={!file || isUploading}
              className="flex-1 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? "Attaching..." : "Attach"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
