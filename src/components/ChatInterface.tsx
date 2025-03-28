"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";

// Define the type for the tool result data structure
interface DatabaseToolResult {
  result?: any[];
  rowCount?: number;
  fields?: Array<{ name: string; dataTypeID: number }>;
  error?: string;
  query?: string;
  message?: string;
}

export default function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      maxSteps: 5,
    });

  // Reference to the chat container for auto-scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Debug output to see message structure
  useEffect(() => {
    if (messages.length > 0) {
      console.log("Current messages:", messages);

      // Auto-scroll to bottom when messages change
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
          chatContainerRef.current.scrollHeight;
      }
    }
  }, [messages]);

  // Helper function to check if a message has completed tool calls
  const hasCompletedToolCall = (message: any, toolInvocationPart: any) => {
    // Better logging to understand the issue
    console.log("Checking if tool call is completed:", toolInvocationPart);

    // Try to get the tool call ID from various possible structures
    const toolCallId =toolInvocationPart.toolInvocation?.id

    console.log("Tool call ID:", toolCallId);

    if (!toolCallId) return false;

    // Check if there's a tool result for this tool invocation
    const hasResult = message.parts.some((part: any) => {
      const isToolResult = part.type === "tool-result";
      const matchesToolCallId =
        part.toolCallId === toolCallId || part.id === toolCallId;

      console.log(
        "Part type:",
        part.type,
        "Part toolCallId:",
        part.toolCallId,
        "Part id:",
        part.id
      );

      return isToolResult && matchesToolCallId;
    });

    console.log("Has result:", hasResult);

    // If no direct match found, check if there are any tool-result parts that appear after this invocation
    if (!hasResult) {
      const currentPartIndex = message.parts.findIndex(
        (p: any) => p === toolInvocationPart
      );
      const hasLaterToolResult = message.parts.some(
        (part: any, index: number) =>
          index > currentPartIndex && part.type === "tool-result"
      );

      console.log(
        "Current part index:",
        currentPartIndex,
        "Has later tool result:",
        hasLaterToolResult
      );

      return hasLaterToolResult;
    }

    return hasResult;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto">
      {/* Chat messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-auto p-6 scrollbar-custom"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#208C4F transparent",
        }}
      >
        <style jsx global>{`
          .scrollbar-custom::-webkit-scrollbar {
            width: 8px;
          }
          .scrollbar-custom::-webkit-scrollbar-track {
            background: transparent;
          }
          .scrollbar-custom::-webkit-scrollbar-thumb {
            background-color: #208c4f;
            border-radius: 20px;
            border: 2px solid transparent;
            background-clip: content-box;
          }
          .scrollbar-custom::-webkit-scrollbar-thumb:hover {
            background-color: #15693a;
          }
        `}</style>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="max-w-2xl">
              <h2 className="text-4xl font-bold mb-8">
                What can I help with?
              </h2>
              <div className="bg-[#0a1b10] p-6 rounded-xl border border-[#15693A] shadow-lg max-w-lg mx-auto">
                <h3 className="text-xl font-semibold text-[#2fbf6d] mb-4">
                  Ask me about your client data
                </h3>
                <p className="text-[#d1e9db] mb-6">
                  I can help you analyze and understand your database
                  information.
                </p>
                <div className="space-y-3 text-left">
                  <p className="font-medium text-[#2fbf6d] mb-2">
                    Try these examples:
                  </p>
                  <div className="space-y-3">
                    <div className="bg-[#081510] p-3 rounded-lg cursor-pointer hover:bg-[#0d1f14] transition-colors text-[#d1e9db]">
                      Show me all active clients
                    </div>
                    <div className="bg-[#081510] p-3 rounded-lg cursor-pointer hover:bg-[#0d1f14] transition-colors text-[#d1e9db]">
                      What email conversations did we have with EcoGoods Store?
                    </div>
                    <div className="bg-[#081510] p-3 rounded-lg cursor-pointer hover:bg-[#0d1f14] transition-colors text-[#d1e9db]">
                      Show me the most recent call transcripts
                    </div>
                    <div className="bg-[#081510] p-3 rounded-lg cursor-pointer hover:bg-[#0d1f14] transition-colors text-[#d1e9db]">
                      Which clients have the most emails in our database?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, messageIndex) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.role === "user"
                      ? "bg-[#081510] text-white rounded-tr-none"
                      : "bg-none rounded-tl-none text-white"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    // Handle different part types
                    if (part.type === "text") {
                      return (
                        <div
                          key={`text-${i}`}
                          className="whitespace-pre-wrap text-[#d1e9db]"
                        >
                          {part.text}
                        </div>
                      );
                    }

                    if (part.type === "tool-invocation") {
                      // More reliable approach: check if there are any tool-result parts after this
                      const toolResultsExist = message.parts.some(
                        (p: any, idx: number) =>
                          idx > i && p.type === "tool-result"
                      );

                      // Only show the tool invocation if there are no subsequent tool results
                      if (!toolResultsExist && isLoading) {
                        return (
                          <div
                            key={`tool-${i}`}
                            className="text-sm text-[#a8d1b9]"
                          >
                            <div className="flex items-center mt-1 mb-2">
                              <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Running SQL query...
                            </div>
                            <pre className="p-2 rounded text-xs overflow-auto bg-[#081510]">
                              {(part.toolInvocation as any).parameters?.query ||
                                JSON.stringify(part.toolInvocation, null, 2)}
                            </pre>
                          </div>
                        );
                      }
                      return null; // Don't render completed tool invocations
                    }

                    // For all other part types, cast to any to check structure
                    const anyPart = part as any;

                    // Try to detect tool results regardless of exact structure
                    if (
                      anyPart.toolResult ||
                      (anyPart.type &&
                        typeof anyPart.type === "string" &&
                        anyPart.type.includes("tool")) ||
                      anyPart.tool
                    ) {
                      // Try to extract the result data, adjusting for different structures
                      let toolResult: any = anyPart.toolResult;

                      // If we don't have direct toolResult, look in other places
                      if (!toolResult) {
                        if (
                          anyPart.content &&
                          typeof anyPart.content === "object"
                        ) {
                          toolResult = anyPart.content;
                        } else if (anyPart.result) {
                          toolResult = anyPart.result;
                        } else {
                          // If still no luck, the part itself might be the result
                          toolResult = anyPart;
                        }
                      }

                      if (!toolResult || typeof toolResult !== "object") {
                        return (
                          <div key={`error-${i}`} className="mt-2 text-red-400">
                            Unable to display result (invalid format)
                          </div>
                        );
                      }

                      if (toolResult.error) {
                        return (
                          <div
                            key={`error-${i}`}
                            className="mt-2 p-4 bg-red-900/30 rounded-lg border border-red-600"
                          >
                            <p className="font-semibold text-red-400">Error:</p>
                            <p className="text-red-300">{toolResult.error}</p>
                          </div>
                        );
                      }

                      const results = toolResult.result || [];

                      if (!Array.isArray(results) || results.length === 0) {
                        return (
                          <div
                            key={`empty-${i}`}
                            className="mt-2 p-3 bg-amber-900/30 rounded-lg border border-amber-600 text-amber-300"
                          >
                            <div className="flex items-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-5 h-5 mr-2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                                />
                              </svg>
                              Query executed successfully, but returned no data.
                            </div>
                          </div>
                        );
                      }

                      // Calculate if this is the last part of the message
                      const isLastPart = i === message.parts.length - 1;
                      // Check if this is the last message
                      const isLastMessage =
                        messageIndex === messages.length - 1;

                      const originalQuery = toolResult.query ? (
                        <div className="mt-1 mb-3">
                          <div className="flex items-center text-xs text-[#2fbf6d] mb-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4 mr-1"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                              />
                            </svg>
                            SQL QUERY
                          </div>
                          <code className="block p-3 bg-[#081510] text-xs rounded-lg overflow-x-auto border border-[#15693A] text-[#2fbf6d] font-mono">
                            {toolResult.query}
                          </code>
                        </div>
                      ) : null;

                      return (
                        <div
                          key={`result-${i}`}
                          className="mt-4 overflow-hidden rounded-lg border border-[#15693A] bg-[#081510] shadow-md"
                        >
                          {originalQuery}
                          <div className="px-4 py-3 bg-gradient-to-r from-[#208C4F] to-[#15693A] text-white font-medium flex items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5 mr-2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 0H9.75m0 0h10.5m-10.5 0H9.375c-.621 0-1.125.504-1.125 1.125M9.75 18.75h10.5c.621 0 1.125-.504 1.125-1.125m-12.75 0c0 .621.504 1.125 1.125 1.125"
                              />
                            </svg>
                            Results ({toolResult.rowCount || results.length}{" "}
                            rows)
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-sm border-collapse text-[#d1e9db]">
                              <thead className="sticky top-0">
                                <tr>
                                  {Object.keys(results[0]).map((column) => (
                                    <th
                                      key={column}
                                      className="p-3 text-left bg-[#0d1f14] text-[#2fbf6d] font-medium border-b border-[#15693A]"
                                    >
                                      {column}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {results.map((row: any, rowIndex: number) => (
                                  <tr
                                    key={rowIndex}
                                    className={
                                      rowIndex % 2 === 0
                                        ? "bg-[#081510]"
                                        : "bg-[#0a1b10]"
                                    }
                                  >
                                    {Object.values(row).map(
                                      (value: any, valueIndex: number) => (
                                        <td
                                          key={valueIndex}
                                          className="p-3 border-b border-[#15693A]/30 text-[#d1e9db]"
                                        >
                                          {value === null ? (
                                            <span className="text-slate-400 italic">
                                              null
                                            </span>
                                          ) : typeof value === "object" ? (
                                            <span className="text-xs font-mono bg-[#0d1f14] p-1 rounded">
                                              {JSON.stringify(value)}
                                            </span>
                                          ) : (
                                            String(value)
                                          )}
                                        </td>
                                      )
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {isLastPart && isLastMessage && isLoading ? (
                            <div className="p-3 bg-[#0d1f14] border-t border-[#15693A]">
                              <div className="flex items-center text-[#2fbf6d]">
                                <svg
                                  className="animate-spin mr-2 h-4 w-4 text-[#2fbf6d]"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                <span className="font-medium">
                                  Analyzing your data...
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="px-3 py-2 text-xs text-[#2fbf6d] bg-[#0d1f14] border-t border-[#15693A]">
                              {isLastPart && isLastMessage
                                ? "Waiting for analysis..."
                                : "Assistant will analyze this data..."}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // If nothing matched, just return null
                    return null;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 py-6 border-t border-[#15693A]">
        <form onSubmit={handleSubmit} className="flex">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Message Retentio..."
            className="flex-1 p-4 bg-[#0a1b10] border border-[#15693A] focus:border-[#208C4F] rounded-l-full outline-none text-white placeholder-[#d1e9db]/50"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`px-6 py-4 rounded-r-full font-medium text-white ${
              isLoading
                ? "bg-[#15693A]/50"
                : "bg-[#208C4F] hover:bg-[#15693A] transition-colors"
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
