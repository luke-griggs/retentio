"use client";

import { useChat } from "ai/react";
import { useState, useRef, useEffect } from "react";
import {
  PaperAirplaneIcon,
  SparklesIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { EmailEditorRef } from "./EmailEditor";
import {
  applyPatchesToEditor,
  streamPatchesToEditor,
} from "@/utils/editor-patches";

interface Task {
  id: string;
  name: string;
  description: string;
  updated_at: string;
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
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);

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

                if (result.type === "patch" && result.patches) {
                  // Apply patches with streaming effect
                  await streamPatchesToEditor(
                    editorRef.current.editor,
                    result.patches,
                    (progress) => {
                      // Could update a progress indicator here
                    }
                  );
                } else if (
                  result.type === "section_operation" &&
                  result.operation
                ) {
                  // Apply section operations using the new method
                  console.log(
                    "Processing section operation:",
                    result.operation
                  );
                  const success = editorRef.current.applySectionOperation(
                    result.operation
                  );

                  if (success) {
                    console.log("Section operation applied successfully");
                    description =
                      result.operation.explanation || "Applied section changes";

                    // Wait for editor to fully update before getting content
                    await new Promise((resolve) => setTimeout(resolve, 100));
                  } else {
                    console.error("Failed to apply section operation");
                  }
                } else if (result.type === "operation" && result.operation) {
                  // Apply operation-based changes
                  const op = result.operation;
                  console.log("Processing operation:", op);

                  if (op.patches && op.patches.length > 0) {
                    const success = applyPatchesToEditor(
                      editorRef.current.editor,
                      {
                        operations: op.patches,
                        targetText: op.target,
                      }
                    );

                    if (!success) {
                      console.error(
                        "Failed to apply patches - target text not found:",
                        op.target
                      );

                      // Fallback: try to do a simple replace if we have the info
                      if (
                        op.action === "replace" &&
                        op.target &&
                        op.replacement
                      ) {
                        const content = editorRef.current.getContent();
                        console.log("Current editor content:", content);

                        // Try multiple approaches to find and replace
                        let newContent = content;
                        let found = false;

                        // 1. Try exact match
                        if (content.includes(op.target)) {
                          newContent = content.replace(
                            op.target,
                            op.replacement
                          );
                          found = true;
                        }

                        // 2. Try with HTML entities decoded (for quotes, etc.)
                        if (!found) {
                          const decodedTarget = op.target
                            .replace(/&quot;/g, '"')
                            .replace(/&apos;/g, "'")
                            .replace(/&amp;/g, "&")
                            .replace(/&lt;/g, "<")
                            .replace(/&gt;/g, ">");

                          if (content.includes(decodedTarget)) {
                            newContent = content.replace(
                              decodedTarget,
                              op.replacement
                            );
                            found = true;
                          }
                        }

                        // 3. Try converting markdown to HTML
                        if (!found) {
                          // Convert markdown bold/italic to HTML
                          const htmlTarget = op.target
                            .replace(
                              /\*\*\*(.+?)\*\*\*/g,
                              "<strong><em>$1</em></strong>"
                            )
                            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                            .replace(/\*(.+?)\*/g, "<em>$1</em>");

                          if (content.includes(htmlTarget)) {
                            newContent = content.replace(
                              htmlTarget,
                              op.replacement
                            );
                            found = true;
                          }
                        }

                        // 4. Try removing all formatting
                        if (!found) {
                          const plainTarget = op.target
                            .replace(/\*\*\*/g, "")
                            .replace(/\*\*/g, "")
                            .replace(/\*/g, "")
                            .replace(/<[^>]*>/g, ""); // Remove HTML tags

                          // Also try to find plain text in content
                          const plainContent = content.replace(/<[^>]*>/g, "");
                          const index = plainContent.indexOf(plainTarget);

                          if (index !== -1) {
                            console.log(
                              "Found plain text match at index:",
                              index
                            );
                            // This is more complex - we found it in plain text but need to replace in HTML
                            // For now, just set the content directly
                            found = true;
                          }
                        }

                        if (found && newContent !== content) {
                          editorRef.current.setContent(newContent);
                          console.log("Successfully replaced content");
                        } else {
                          console.error(
                            "Could not find target text in any format"
                          );
                          console.log("Target variations tried:", {
                            exact: op.target,
                            html: op.target.replace(
                              /\*\*\*(.+?)\*\*\*/g,
                              "<strong><em>$1</em></strong>"
                            ),
                            plain: op.target.replace(/\*+/g, ""),
                          });
                        }
                      }
                    }
                  }
                  description = op.explanation || description;
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    handleSubmit(e);
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
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-medium text-white">AI Email Editor</h3>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Ask me to improve your email copy
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <SparklesIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
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
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">
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
                        <p className="text-xs text-gray-400">{explanation}</p>
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
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me to improve your email..."
            disabled={isLoading || isApplyingChanges}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || isApplyingChanges}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
