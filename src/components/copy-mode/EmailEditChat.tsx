"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import {
  PaperAirplaneIcon,
  SparklesIcon,
  ArrowPathIcon,
  PaperClipIcon,
} from "@heroicons/react/24/outline";
import { EmailEditorRef } from "./EmailEditor";

interface Task {
  id: string;
  name: string;
  description: string;
  updated_at: string;
  content_strategy?: string;
  promo?: string;
}

interface EmailEditChatProps {
  task: Task;
  emailContent: string;
  onContentChange: (content: string, description?: string) => void;
  editorRef: React.RefObject<EmailEditorRef | null>;
}

export default function EmailEditChat({
  task,
  emailContent,
  onContentChange,
  editorRef,
}: EmailEditChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    url: string;
    name: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
  } = useChat({
    api: "/api/chat/email-edit",
    body: {
      taskId: task.id,
      currentContent: emailContent,
    },
  });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Process tool invocations and apply changes directly
  useEffect(() => {
    messages.forEach((message) => {
      if (message.toolInvocations) {
        message.toolInvocations.forEach(async (toolInvocation) => {
          if (
            toolInvocation.state === "result" &&
            toolInvocation.toolName === "email_edit" &&
            toolInvocation.result?.success &&
            !toolInvocation.result?.applied // Track if we've already applied this
          ) {
            const result = toolInvocation.result;

            // Mark as applied to prevent re-application
            toolInvocation.result.applied = true;

            if (editorRef.current?.editor) {
              setIsApplyingChanges(true);

              try {
                let description = result.explanation || "AI edit";

                // Handle full HTML replacement
                if (result.type === "full_replacement" && result.html) {
                  // Set the complete HTML content
                  editorRef.current.setContent(result.html);
                  console.log("Applied full HTML replacement");
                }

                // Get the updated content and notify parent
                const newContent = editorRef.current.getContent();
                onContentChange(newContent, description);
              } catch (error) {
                console.error("Error applying changes:", error);
              } finally {
                setIsApplyingChanges(false);
              }
            }
          }
        });
      }
    });
  }, [messages, editorRef, onContentChange]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Function to handle PDF upload
  const handleFileUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Please select a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("files", file);

      const response = await fetch("/api/upload/attachments", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.attachments && data.attachments.length > 0) {
          const attachment = data.attachments[0];
          setAttachedFile({
            file,
            url: attachment.url,
            name: file.name,
          });
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  const removeAttachedFile = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Create experimental_attachments array if file is attached
    const attachments = attachedFile
      ? [
          {
            name: attachedFile.name,
            contentType: attachedFile.file.type,
            url: attachedFile.url,
          },
        ]
      : undefined;

    // Submit with attachments
    handleSubmit(e, {
      experimental_attachments: attachments,
    });

    // Clear the attached file after sending
    if (attachedFile) {
      removeAttachedFile();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e as any);
    }
  };

  // Suggested prompts for quick actions
  const suggestedPrompts = [
    "Make the subject line more compelling",
    "Add urgency to the CTA",
    "Shorten for mobile readers",
    "Add personalization tags",
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="flex justify-center pb-3">
              <img
                src="/rio-transparent.png"
                alt="RIO"
                width={64}
                height={64}
              />
            </div>
            <h1 className="text-2xl font-bold text-white pb-4">RIO</h1>
            <p className="text-sm text-gray-400 mb-4">
              I can help you improve your email copy. Try asking me to:
            </p>
            <div className="space-y-2">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => append({ role: "user", content: prompt })}
                  className="block w-full text-left px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id}>
            <div
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 break-words ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content ||
                    (message.role === "assistant" &&
                    (message.toolInvocations?.length ?? 0) > 0
                      ? "I've made the following changes to your email:"
                      : message.content)}
                </p>
              </div>
            </div>

            {/* Show change summary for AI messages */}
            {message.role === "assistant" && message.toolInvocations && (
              <div className="mt-2 space-y-2">
                {message.toolInvocations
                  .filter((inv) => {
                    return (
                      inv.state === "result" &&
                      inv.toolName === "email_edit" &&
                      inv.result?.success
                    );
                  })
                  .map((inv, idx) => {
                    if (inv.state !== "result") return null;
                    const explanation =
                      inv.result?.explanation ||
                      inv.result?.operation?.explanation ||
                      "Applied changes";
                    return (
                      <div
                        key={idx}
                        className="ml-4 flex items-start space-x-2"
                      >
                        <div className="w-1 h-1 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-xs text-gray-400 break-words">
                          {explanation}
                        </p>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ))}

        {(isLoading || isApplyingChanges) && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-lg px-4 py-2">
              <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleFormSubmit}
        className="p-4 border-t border-gray-700"
      >
        {/* File attachment indicator */}
        {attachedFile && (
          <div className="mb-3 flex items-center justify-between bg-gray-800 rounded-lg p-3 border border-gray-600">
            <div className="flex items-center space-x-2">
              <PaperClipIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300">{attachedFile.name}</span>
              <span className="text-xs text-gray-500">
                ({(attachedFile.file.size / 1024 / 1024).toFixed(2)} MB)
              </span>
            </div>
            <button
              type="button"
              onClick={removeAttachedFile}
              className="text-gray-400 hover:text-red-400 transition-colors"
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
        )}

        <div className="flex items-end space-x-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to improve your email..."
            disabled={isLoading || isApplyingChanges}
            rows={1}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-600 disabled:opacity-50 resize-none overflow-hidden min-h-[40px] max-h-[120px]"
          />

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          {/* TODO: Make this actually work */}
          {/* <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isLoading || isApplyingChanges}
            className="px-3 py-2.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title="Upload PDF for context"
          >
            {isUploading ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <PaperClipIcon className="w-5 h-5" />
            )}
          </button> */}

          <button
            type="submit"
            disabled={!input.trim() || isLoading || isApplyingChanges}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
