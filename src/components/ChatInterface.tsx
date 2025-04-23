"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
// Define type for database query results
interface DatabaseResult {
  result?: unknown[];
  rowCount?: number;
  fields?: Array<{ name: string; dataTypeID: number }>;
  error?: string;
  query?: string;
  message?: string;
}

// Custom type for message parts
interface MessagePart {
  type: string;
  text?: string;
  toolInvocation?: {
    id?: string;
    parameters?: {
      query?: string;
    };
  };
  toolResult?: DatabaseResult;
  toolCallId?: string;
  id?: string;
  content?: unknown;
  result?: unknown;
  tool?: unknown;
}

export default function ChatInterface() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setInput,
  } = useChat({
    api: "/api/chat",
    maxSteps: 5,
  });

  // Reference to the chat container for auto-scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // Reference to track the last message for scrolling
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Improve scrolling behavior with a custom scroll handler that works for all messages
  const scrollToLatestMessage = () => {
    if (lastMessageRef.current) {
      // Use requestAnimationFrame to ensure scrolling happens after rendering
      requestAnimationFrame(() => {
        const inputHeight = 120; // Increased height to account for padding
        const navbarHeight = 60; // Approximate navbar height

        // Ensure lastMessageRef.current is not null before accessing its properties
        if (lastMessageRef.current) {
          // Calculate scroll position: message position - viewport height + message height + input height + padding
          const scrollPosition =
            lastMessageRef.current.offsetTop -
            (window.innerHeight -
              lastMessageRef.current.offsetHeight -
              inputHeight) +
            navbarHeight +
            40; // Extra padding for visibility

          window.scrollTo({
            top: Math.max(0, scrollPosition), // Ensure we don't scroll to negative positions
            behavior: "smooth",
          });
        }
      });
    }
  };

  // When new messages arrive, scroll to the appropriate position
  useEffect(() => {
    if (messages.length > 0) {
      console.log("Current messages:", messages);

      // For first message, scroll immediately
      if (messages.length === 1) {
        setTimeout(scrollToLatestMessage, 100);
      } else {
        // For subsequent messages
        const hasToolInvocation = messages[messages.length - 1].parts.some(
          (part) => part.type === "tool-invocation"
        );

        // If it has tool invocation, scroll immediately and then after a delay
        if (hasToolInvocation) {
          setTimeout(scrollToLatestMessage, 100);
          // Scroll again after some time to account for the SQL loading UI
          setTimeout(scrollToLatestMessage, 500);
        } else {
          // Normal message, just scroll once
          setTimeout(scrollToLatestMessage, 100);
        }
      }
    }
  }, [messages]);

  // Function to handle clicking on an example query
  const handleExampleClick = (exampleText: string) => {
    setInput(exampleText);
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto pb-24">
      {/* Chat messages - now part of the main content flow */}
      <div ref={chatContainerRef} className="p-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
            <div className="max-w-2xl">
              <Image
                src="/rio.png"
                alt="Rio"
                width={100}
                height={100}
                className="mx-auto mb-4 rounded-full"
              />
              <h2 className="text-4xl font-bold mb-2">Rio</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                I can help you analyze and interact with Retentio's database
              </p>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg max-w-lg mx-auto">
                <div className="space-y-3 text-left">
                  <h3 className="text-xl font-semibold text-blue-400 mb-4">
                    Try these examples:
                  </h3>
                  <div className="space-y-3">
                    <div
                      className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200"
                      onClick={() =>
                        handleExampleClick(
                          "Which campaigns had the most conversions in april 2025?"
                        )
                      }
                    >
                      Which campaigns had the most conversions in april 2025?
                    </div>

                    <div
                      className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200"
                      onClick={() =>
                        handleExampleClick(
                          "Which campaign subject lines generated the most unique clicks?"
                        )
                      }
                    >
                      Which campaign subject lines generated the most unique
                      clicks?
                    </div>
                    <div
                      className="bg-gray-100 dark:bg-gray-900 p-3 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-800 dark:text-gray-200"
                      onClick={() =>
                        handleExampleClick(
                          "why might our best performing flows be doing well"
                        )
                      }
                    >
                      why might our best performing flows be doing well?
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
                ref={
                  messageIndex === messages.length - 1 ? lastMessageRef : null
                }
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    message.role === "user"
                      ? "bg-blue-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tr-none"
                      : "bg-none rounded-tl-none text-gray-900 dark:text-white"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    // Handle different part types
                    if (part.type === "text") {
                      if (message.role === "user") {
                        return (
                          <div
                            key={`text-${i}`}
                            className="whitespace-pre-wrap"
                          >
                            {part.text}
                          </div>
                        );
                      } else {
                        // Render assistant messages with markdown
                        return (
                          <div
                            key={`text-${i}`}
                            className="prose dark:prose-invert max-w-none"
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {part.text}
                            </ReactMarkdown>
                          </div>
                        );
                      }
                    }

                    if (part.type === "tool-invocation") {
                      // More reliable approach: check if there are any tool-result parts after this
                      const toolResultsExist = message.parts.some(
                        (p, idx: number) =>
                          // Using string comparison to avoid type errors
                          idx > i && String(p.type) === "tool-result"
                      );

                      // Only show the tool invocation if there are no subsequent tool results
                      // AND this message is the last message (to prevent duplicates in older messages)
                      if (
                        !toolResultsExist &&
                        isLoading &&
                        messageIndex === messages.length - 1
                      ) {
                        const typedPart = part as MessagePart;
                        const query =
                          typedPart.toolInvocation?.parameters?.query;

                        return (
                          <div
                            key={`tool-${i}`}
                            className="text-sm text-gray-500 dark:text-gray-400"
                          >
                            <div className="flex items-center mt-1 mb-2">
                              <svg
                                className="h-8 w-8 pr-2"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 300 150"
                              >
                                <path
                                  fill="none"
                                  stroke="#60A5FA"
                                  strokeWidth="15"
                                  strokeLinecap="round"
                                  strokeDasharray="300 385"
                                  strokeDashoffset="0"
                                  d="M275 75c0 31-27 50-50 50-58 0-92-100-150-100-28 0-50 22-50 50s23 50 50 50c58 0 92-100 150-100 24 0 50 19 50 50Z"
                                >
                                  <animate
                                    attributeName="stroke-dashoffset"
                                    calcMode="spline"
                                    dur="2"
                                    values="685;-685"
                                    keySplines="0 0 1 1"
                                    repeatCount="indefinite"
                                  ></animate>
                                </path>
                              </svg>
                              thinking...
                            </div>
                            <pre className="p-2 rounded text-xs overflow-auto bg-gray-100 dark:bg-gray-900">
                              {/* {query ||
                                JSON.stringify(
                                  typedPart.toolInvocation,
                                  null,
                                  2
                                )} */}
                            </pre>
                          </div>
                        );
                      }
                      return null; // Don't render completed tool invocations
                    }

                    // For all other part types, cast to proper type to check structure
                    const typedPart = part as MessagePart;

                    // Try to detect tool results regardless of exact structure
                    if (
                      typedPart.toolResult ||
                      (typedPart.type &&
                        typeof typedPart.type === "string" &&
                        typedPart.type.includes("tool")) ||
                      typedPart.tool
                    ) {
                      // Try to extract the result data, adjusting for different structures
                      let toolResult: DatabaseResult =
                        typedPart.toolResult || {};

                      // If we don't have direct toolResult, look in other places
                      if (!toolResult || Object.keys(toolResult).length === 0) {
                        if (
                          typedPart.content &&
                          typeof typedPart.content === "object"
                        ) {
                          toolResult = typedPart.content as DatabaseResult;
                        } else if (typedPart.result) {
                          toolResult = typedPart.result as DatabaseResult;
                        } else {
                          // If still no luck, the part itself might be the result
                          toolResult = typedPart as unknown as DatabaseResult;
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
                            className="mt-2 p-4 bg-red-100 dark:bg-red-900/30 rounded-lg border border-red-300 dark:border-red-600"
                          >
                            <p className="font-semibold text-red-600 dark:text-red-400">
                              Error:
                            </p>
                            <p className="text-red-500 dark:text-red-300">
                              {toolResult.error}
                            </p>
                          </div>
                        );
                      }

                      const results = toolResult.result || [];

                      if (!Array.isArray(results) || results.length === 0) {
                        return (
                          <div
                            key={`empty-${i}`}
                            className="mt-2 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg border border-amber-300 dark:border-amber-600 text-amber-600 dark:text-amber-300"
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
                          <div className="flex items-center text-xs text-blue-500 mb-1">
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
                          <code className="block p-3 bg-gray-100 dark:bg-gray-900 text-xs rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 font-mono">
                            {toolResult.query}
                          </code>
                        </div>
                      ) : null;

                      return (
                        <div
                          key={`result-${i}`}
                          className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-md"
                        >
                          {originalQuery}
                          <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium flex items-center">
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
                            <table className="w-full text-sm border-collapse">
                              <thead className="sticky top-0">
                                <tr>
                                  {/* Only try to access keys if results[0] is actually an object */}
                                  {results[0] && typeof results[0] === "object"
                                    ? Object.keys(
                                        results[0] as Record<string, unknown>
                                      ).map((column) => (
                                        <th
                                          key={column}
                                          className="p-3 text-left bg-gray-100 dark:bg-gray-900 text-blue-600 dark:text-blue-400 font-medium border-b border-gray-200 dark:border-gray-700"
                                        >
                                          {column}
                                        </th>
                                      ))
                                    : null}
                                </tr>
                              </thead>
                              <tbody>
                                {/* Ensure we're only mapping over array items that are objects */}
                                {results
                                  .filter(
                                    (item): item is Record<string, unknown> =>
                                      typeof item === "object" && item !== null
                                  )
                                  .map((row, rowIndex) => (
                                    <tr
                                      key={rowIndex}
                                      className={
                                        rowIndex % 2 === 0
                                          ? "bg-white dark:bg-gray-800"
                                          : "bg-gray-50 dark:bg-gray-700"
                                      }
                                    >
                                      {Object.values(row).map(
                                        (value, valueIndex) => (
                                          <td
                                            key={valueIndex}
                                            className="p-3 border-b border-gray-200 dark:border-gray-700/30"
                                          >
                                            {value === null ? (
                                              <span className="text-gray-400 italic">
                                                null
                                              </span>
                                            ) : typeof value === "object" ? (
                                              <span className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-1 rounded">
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
                            <div className="p-3 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                              <div className="flex items-center text-blue-500">
                                <svg
                                  className="animate-spin mr-2 h-6 w-6"
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
                            <div className="px-3 py-2 text-xs text-blue-500 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
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

        {/* Loading indicator shown immediately after user sends a message */}
        {isLoading &&
          messages.length > 0 &&
          messages[messages.length - 1].role === "user" && (
            <div className="flex justify-start p-6">
              <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 max-w-[80%] rounded-2xl p-4 bg-none rounded-tl-none">
                <svg
                  className="h-8 w-8 pr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 300 150"
                >
                  <path
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth="15"
                    strokeLinecap="round"
                    strokeDasharray="300 385"
                    strokeDashoffset="0"
                    d="M275 75c0 31-27 50-50 50-58 0-92-100-150-100-28 0-50 22-50 50s23 50 50 50c58 0 92-100 150-100 24 0 50 19 50 50Z"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      calcMode="spline"
                      dur="2"
                      values="685;-685"
                      keySplines="0 0 1 1"
                      repeatCount="indefinite"
                    ></animate>
                  </path>
                </svg>
                thinking...
              </div>
            </div>
          )}
      </div>

      {/* Input area - now fixed to the bottom of the viewport */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <form onSubmit={handleSubmit} className="flex">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Message Rio..."
              className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-blue-500 rounded-l-full outline-none text-gray-900 dark:text-white placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`px-6 py-4 rounded-r-full font-medium text-white ${
                isLoading
                  ? "bg-blue-400/50"
                  : "bg-blue-500 hover:bg-blue-600 transition-colors"
              }`}
              disabled={isLoading}
            >
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
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
