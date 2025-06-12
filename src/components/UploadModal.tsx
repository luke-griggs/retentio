"use client";

import { useState, useRef } from "react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
  );
}

// Loading Modal Component
function LoadingModal({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]">
      <div className="bg-slate-900 rounded-xl p-8 mx-4 border border-slate-700 text-center">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner />
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              We're uploading your calendar
            </h3>
            <p className="text-sm text-gray-400">
              This should only take a moment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
    } else {
      alert("Please select a CSV file");
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

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setShowLoadingModal(true);

    try {
      // First upload to Vercel Blob
      const uploadFormData = new FormData();
      uploadFormData.append("files", file);

      const uploadResponse = await fetch("/api/upload/attachments", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        alert(error.error || "Upload failed. Please try again.");
        return;
      }

      const uploadData = await uploadResponse.json();
      const fileUrl = uploadData.attachments[0].url;

      // Then send to ClickUp with the file URL
      const clickupFormData = new FormData();
      clickupFormData.append("file", file);
      clickupFormData.append("fileUrl", fileUrl);

      const clickupResponse = await fetch("/api/upload/clickup", {
        method: "POST",
        body: clickupFormData,
      });

      if (clickupResponse.ok) {
        const result = await clickupResponse.json();
        alert(
          `Upload successful! Created ${result.createdTasks} tasks in Clickup!🚀`
        );
        setFile(null);
        onClose();
      } else {
        const error = await clickupResponse.json();
        alert(error.error || "Upload to ClickUp failed. Please try again.");
        console.log(clickupResponse);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      setShowLoadingModal(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return; // Prevent closing during upload
    setFile(null);
    setIsDragging(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Upload Modal */}
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-slate-900 rounded-xl p-6 w-full max-w-md mx-4 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">
              Upload to ClickUp
            </h3>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                Select CSV File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
              <div
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`w-full px-4 py-8 border-2 border-dashed rounded-lg text-center transition-all ${
                  isUploading
                    ? "cursor-not-allowed opacity-50 border-slate-600 text-gray-400"
                    : isDragging
                    ? "border-yellow-400 bg-yellow-400/10 text-yellow-300 cursor-pointer"
                    : file
                    ? "border-blue-500 bg-blue-500/10 text-blue-300 cursor-pointer"
                    : "border-slate-600 text-gray-300 hover:border-slate-500 hover:text-white cursor-pointer"
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <svg
                    className={`w-8 h-8 ${
                      isUploading
                        ? "text-gray-400"
                        : isDragging
                        ? "text-yellow-400"
                        : file
                        ? "text-blue-400"
                        : "text-gray-400"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <div>
                    {isUploading ? (
                      <>
                        <p className="text-sm font-medium text-gray-400">
                          Your file is being uploaded to ClickUp
                        </p>
                        <p className="text-xs text-gray-400">
                          This should only take a moment
                        </p>
                      </>
                    ) : isDragging ? (
                      <p className="text-sm font-medium">
                        Drop your CSV file here
                      </p>
                    ) : file ? (
                      <>
                        <p className="text-sm font-medium text-blue-300">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Click to change file
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">
                          Drop your CSV file here or click to browse
                        </p>
                        <p className="text-xs text-gray-400">
                          Only CSV files are supported
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="flex-1 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Modal */}
      <LoadingModal isOpen={showLoadingModal} />
    </>
  );
}
