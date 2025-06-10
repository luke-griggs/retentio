"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UploadModal } from "./UploadModal";
import { AttachFileModal } from "./AttachFileModal";

type ChatMode = "analysis" | "audit";

export interface AttachedFile {
  file: File;
  fileUrl: string;
  id: string;
  contentType?: string;
  uploadedAt?: string;
}

export interface ChatInputProps {
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    attachedFiles?: AttachedFile[]
  ) => void;
  disabled: boolean;
  chatMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  isFixed?: boolean; // New prop for positioning
  onFileAttach?: (file: File, fileUrl: string) => void; // New prop for file attachments
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  chatMode,
  onModeChange,
  isFixed = true, // Default to true
  onFileAttach,
}: ChatInputProps) {
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleMode = () => {
    onModeChange(chatMode === "analysis" ? "audit" : "analysis");
  };

  const handleFileAttachInternal = (file: File, fileUrl: string) => {
    const newAttachedFile: AttachedFile = {
      file,
      fileUrl,
      id: `${Date.now()}-${Math.random()}`,
    };
    setAttachedFiles((prev) => [...prev, newAttachedFile]);

    // Still call the parent handler if provided
    if (onFileAttach) {
      onFileAttach(file, fileUrl);
    }
  };

  const removeAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
          <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
        </svg>
      );
    }

    if (extension === "pdf") {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
        </svg>
      );
    }

    if (["csv", "xls", "xlsx"].includes(extension || "")) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          <path d="M8,12V14H16V12H8M8,16V18H13V16H8Z" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      </svg>
    );
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowUploadDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Create a ref for the textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Adjust textarea height automatically
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight measurement
    textarea.style.height = "auto";

    // Calculate new height (clamped between min and max height)
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 60), 200);
    textarea.style.height = `${newHeight}px`;

    // Show/hide scrollbar based on content height
    textarea.style.overflowY = textarea.scrollHeight > 200 ? "auto" : "hidden";
  }, []);

  // Adjust height whenever input value changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  // Custom handler for textarea to handle multiline input
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Create a new synthetic event instead of trying to cast
    // as the originalHandleInputChange expects a specific event type.
    const newEvent = {
      target: {
        value: e.target.value,
      },
      preventDefault: e.preventDefault,
      stopPropagation: e.stopPropagation,
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    onChange(newEvent);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (but not when Shift is pressed)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if ((value.trim() || attachedFiles.length > 0) && !disabled) {
        onSubmit(
          e as unknown as React.FormEvent<HTMLFormElement>,
          attachedFiles
        );
        setAttachedFiles([]); // Clear attached files after submit
      }
    }
    // Allow Shift+Enter to insert a new line (default behavior)
  };

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((value.trim() || attachedFiles.length > 0) && !disabled) {
      onSubmit(e, attachedFiles);
      setAttachedFiles([]); // Clear attached files after submit
    }
  };

  const wrapperClasses = isFixed
    ? "fixed bottom-6 left-6 right-6 z-10" // Removed background and border, added margin from edges
    : "w-full"; // When not fixed, parent controls width/centering

  const formClasses = `flex relative ${
    isFixed ? "max-w-4xl mx-auto" : "max-w-4xl mx-auto" // Consistent max-width
  }`;

  return (
    <div className={wrapperClasses}>
      <form onSubmit={handleFormSubmit} className={formClasses}>
        <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl">
          {/* File attachments preview */}
          {attachedFiles.length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((attachedFile) => (
                  <div
                    key={attachedFile.id}
                    className="flex items-center gap-2 bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-gray-200"
                  >
                    <div className="text-green-400">
                      {getFileIcon(attachedFile.file.name)}
                    </div>
                    <span className="max-w-[200px] truncate">
                      {attachedFile.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachedFile(attachedFile.id)}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Remove file"
                    >
                      <svg
                        className="w-4 h-4"
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
                ))}
              </div>
            </div>
          )}

          {/* Textarea container */}
          <div className="relative w-full">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="How can Rio Help?"
              disabled={disabled}
              rows={1}
              className={`w-full px-6 bg-transparent outline-none resize-none leading-tight align-middle overflow-hidden text-white placeholder-gray-500 ${
                isFixed
                  ? "py-5 min-h-[80px] max-h-[200px]" // Removed pr-20 since buttons are now below
                  : "py-6 min-h-[80px] max-h-[200px] text-lg" // Removed pr-20 since buttons are now below
              }`}
            />
          </div>

          {/* Separator line */}

          {/* Buttons container - positioned below textarea */}
          <div className="flex items-center justify-between px-4 pb-4">
            {/* Left side - File upload button */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowUploadDropdown(!showUploadDropdown)}
                disabled={disabled}
                className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm transition-colors ${
                  disabled
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer"
                }`}
                title="Upload file"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                  />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showUploadDropdown && (
                <div className="absolute top-10 left-0 bg-slate-800 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[160px] z-10">
                  {/* <button
                    type="button"
                    onClick={() => {
                      setShowAttachModal(true);
                      setShowUploadDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    Attach a file
                  </button> */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(true);
                      setShowUploadDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    Upload a Calendar
                  </button>
                </div>
              )}
            </div>

            {/* Right side - Mode and Send buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={toggleMode}
                disabled={disabled}
                className={`h-8 px-4 rounded-full text-xs font-medium transition-all duration-200 flex items-center cursor-pointer ${
                  chatMode === "audit"
                    ? "bg-[#1d3a5a] text-[#5aaff9] hover:bg-[#2a4a6d]"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                title={`Switch to ${
                  chatMode === "analysis" ? "Audit" : "Analysis"
                } Mode`}
              >
                {chatMode === "audit" && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-3.5 h-3.5 mr-1.5"
                  >
                    <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75c-1.036 0-1.875-.84-1.875-1.875v-11.25zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75C3.84 21.75 3 20.91 3 19.875v-6.75z" />
                  </svg>
                )}
                {chatMode === "audit" ? "Audit" : "Analysis"}
              </button>
              <button
                type="submit"
                disabled={
                  disabled || (!value.trim() && attachedFiles.length === 0)
                }
                className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm ${
                  disabled || (!value.trim() && attachedFiles.length === 0)
                    ? "bg-gray-700 text-gray-200 cursor-not-allowed"
                    : "bg-yellow-400 text-black hover:bg-yellow-300 cursor-pointer hover:scale-105 transition-transform"
                } transition-colors`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />

      <AttachFileModal
        isOpen={showAttachModal}
        onClose={() => setShowAttachModal(false)}
        onFileAttach={handleFileAttachInternal}
      />

      {/* Disclaimer message */}
      <div className="text-center mt-1 mb-1">
        <p className="text-xs font-semibold text-gray-300/50">
          Rio can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
