// app/components/ChatInterface.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useCallback, forwardRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { motion } from "framer-motion";

import { ChartRenderer } from "@/components/ChartRenderer";
import DbTable from "@/components/DbTable";
import { getToolResult } from "@/app/utils/chat";
import { useMessages } from "@/hooks/use-messages";

// Custom scrollbar styles
const scrollbarStyles = `
  .chat-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .chat-scrollbar::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 4px;
  }
  
  .chat-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%);
    border-radius: 4px;
    border: 1px solid rgba(251, 191, 36, 0.3);
  }
  
  .chat-scrollbar::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
    box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
  }
  
  .chat-scrollbar::-webkit-scrollbar-corner {
    background: transparent;
  }
  
  /* Firefox scrollbar */
  .chat-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #fbbf24 transparent;
  }
`;

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface DatabaseResult {
  result?: unknown[];
  rowCount?: number;
  fields?: Array<{ name: string; dataTypeID: number }>;
  error?: string;
  query?: string;
  message?: string;
}

export interface MessagePart {
  type: string;
  text?: string;
  toolInvocation?: {
    toolCallId?: string;
    toolName?: string;
    args?: any;
    state?: any;
    result?: any;
  };
  reasoning?: string;
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

type ChatMode = "analysis" | "audit";

/* ------------------------------------------------------------------ */
/* Props for ChatInput (to be passed around)                          */
/* ------------------------------------------------------------------ */
interface ChatInputProps {
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  chatMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  isFixed?: boolean; // New prop for positioning
}

export default function ChatInterface() {
  /* --------------------------- chat state -------------------------- */
  const [chatMode, setChatMode] = useState<ChatMode>("analysis");

  const {
    messages,
    input,
    handleInputChange: originalHandleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    setInput,
    status,
  } = useChat({
    api: "/api/chat",
    maxSteps: 15,
    body: {
      chatMode,
    },
  });

  // Inject custom scrollbar styles
  useEffect(() => {
    // Check if styles are already injected
    if (document.getElementById("chat-scrollbar-styles")) {
      return;
    }

    const styleElement = document.createElement("style");
    styleElement.id = "chat-scrollbar-styles";
    styleElement.textContent = scrollbarStyles;
    document.head.appendChild(styleElement);

    return () => {
      const existingStyle = document.getElementById("chat-scrollbar-styles");
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  // Custom input handler that works with both input and textarea elements
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    originalHandleInputChange(e as React.ChangeEvent<HTMLInputElement>);
  };

  // Wrap handleSubmit to include chatMode
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    originalHandleSubmit(e, {
      // options: {
      //     body: { chatMode }
      // }
    });
  };

  // Use the new scroll management hooks
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  } = useMessages({ chatId: "", status: isLoading ? "streaming" : "ready" });

  /* --------------------------- helpers ---------------------------- */
  const fillExample = (text: string) => setInput(text);

  const chatInputSharedProps: Omit<ChatInputProps, "isFixed"> = {
    value: input,
    onChange: handleInputChange,
    onSubmit: handleSubmit,
    disabled: isLoading,
    chatMode,
    onModeChange: setChatMode,
  };

  if (messages.length === 0 && !isLoading) {
    // Show InitialView if no messages and not initially loading
    return (
      <InitialView
        fillExample={fillExample}
        chatInputProps={chatInputSharedProps}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#1A2030] via-[#3a5a8a] to-[#2e4a6f] relative overflow-hidden">
      {/* Top decorative layer can stay absolute */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/clouds.png"
          alt="Background clouds"
          fill
          className="object-cover opacity-20 scale-125"
          priority
        />
      </div>

      {/* --- scrollable message pane --- */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-scroll z-10 chat-scrollbar"
      >
        <div className="max-w-5xl mx-auto pt-6 pb-40">
          <div className="p-6 space-y-6">
            {messages.map((msg, idx) => {
              // Only render the message bubble if it has content to display
              const hasContent = msg.parts?.some((part: MessagePart) => {
                if (part.type === "text" && part.text && part.text.trim()) {
                  return true;
                }
                const res = getToolResult(part as MessagePart);
                return res?.spec || res?.db;
              });

              // Don't render empty bubbles
              if (!hasContent) {
                return null;
              }

              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  requiresScrollPadding={
                    hasSentMessage && idx === messages.length - 1
                  }
                />
              );
            })}
            {isLoading && messages.length > 0 && <Thinking />}

            {/* Scroll target for streaming responses */}
            <motion.div
              ref={messagesEndRef}
              className="shrink-0 min-w-[24px] min-h-[24px]"
              onViewportEnter={onViewportEnter}
              onViewportLeave={onViewportLeave}
            />
          </div>
        </div>
      </div>

      {/* Input bar pinned to the bottom of the flex column */}
      <ChatInput {...chatInputSharedProps} isFixed={false} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Initial View Component (shown when no messages)                    */
/* ------------------------------------------------------------------ */

interface ExamplePrompts {
  title: string;
  description: string;
}

const examplePrompts: ExamplePrompts[] = [
  {
    title: "Which campaigns had the most conversions in April 2025?",
    description: "Get a short and quick summary of campaign conversions.",
  },
  {
    title: "Which campaign subject lines generated the most unique clicks?",
    description: "Analyze click rates based on subject lines.",
  },
  {
    title: "Why might our best-performing flows be doing well?",
    description: "Understand the success factors of top flows.",
  },
];

function ExampleCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-slate-900 border border-slate-700 p-5 rounded-xl hover:bg-slate-800 transition-all duration-200 text-left shadow-2xl"
    >
      <h4 className="font-semibold text-sm text-white mb-2 leading-tight">
        {title}
      </h4>
      <p className="text-xs text-gray-300 leading-relaxed">{description}</p>
    </div>
  );
}

interface InitialViewProps {
  fillExample: (text: string) => void;
  chatInputProps: Omit<ChatInputProps, "isFixed">;
}

function InitialView({ fillExample, chatInputProps }: InitialViewProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 py-8 bg-gradient-to-b from-[#0D1323] via-[#4783F5] to-[#A6D8FD] text-white relative overflow-hidden">
      {/* Background clouds */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/clouds.png"
          alt="Background clouds"
          fill
          className="object-cover opacity-70 scale-125"
          priority
        />
      </div>

      {/* Content - positioned above clouds */}
      <div className="relative z-10 flex flex-col items-center">
        <Image
          src="/rio2.png"
          alt="Rio"
          width={160}
          height={160}
          className="mb-6 rounded-full shadow-2xl"
        />
        <h2 className="text-6xl md:text-7xl font-black mb-8 text-shadow-lg tracking-tight">
          Hello, I'm <span className="text-yellow-400 italic">RIO</span>
        </h2>

        {/* Chat Input Container - matching the form padding exactly */}
        <div className="w-full max-w-4xl px-4 mb-10">
          {" "}
          {/* Added px-4 to match form padding */}
          <ChatInput {...chatInputProps} isFixed={false} />
        </div>

        {/* Example Cards Container - matching the input container exactly */}
        <div className="w-full max-w-4xl px-4">
          {" "}
          {/* Added px-4 to match input container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {examplePrompts.map((ex) => (
              <ExampleCard
                key={ex.title}
                title={ex.title}
                description={ex.description}
                onClick={() => fillExample(ex.title)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Child components                                                   */
/* ------------------------------------------------------------------ */

interface BubbleProps {
  message: any;
  requiresScrollPadding: boolean;
}

const MessageBubble = forwardRef<HTMLDivElement, BubbleProps>(
  ({ message, requiresScrollPadding }, ref) => (
    <div
      ref={ref}
      data-message-role={message.role}
      className={`w-full max-w-[94%] mx-auto px-2 pl-5 flex ${
        message.role === "assistant" && requiresScrollPadding ? "min-h-96" : ""
      } ${message.role === "user" ? "justify-end" : "justify-center"}`}
    >
      <div
        className={`${
          message.role === "user" ? "max-w-[80%]" : "w-full"
        } rounded-2xl p-4 backdrop-blur-sm ${
          message.role === "user"
            ? "bg-gradient-to-br from-yellow-400/90 to-yellow-500/90 text-black rounded-tr-none shadow-xl border border-yellow-300/50"
            : "bg-slate-900/80 text-white rounded-tl-none shadow-xl border border-slate-700/50"
        }`}
      >
        {message.parts?.map((part: MessagePart, i: number) => {
          /* -------- plain text -------- */
          if (part.type === "text") {
            return (
              <MarkdownText
                key={`text-${i}`}
                text={part.text ?? ""}
                isUser={message.role === "user"}
              />
            );
          }

          /* -------- generic tool result (chart / db table ) -------- */
          const res = getToolResult(part as MessagePart);
          if (res?.spec) {
            return <ChartRenderer key={`chart-${i}`} spec={res.spec} />;
          }

          if (res?.db) {
            return (
              <DbTable key={`db-${i}`} results={res.db as DatabaseResult[]} />
            );
          }

          // if (res?.cdnUrl) { TODO: add back after ui/ux is updated
          //   return (
          //     <img
          //       src={res.cdnUrl}
          //       alt="Campaign image"
          //       className="max-w-full rounded-lg"
          //     />
          //   );
          // }

          return null;
        })}
      </div>
    </div>
  )
);
MessageBubble.displayName = "MessageBubble";

const MarkdownText = ({ text, isUser }: { text: string; isUser: boolean }) => (
  <div
    className={
      isUser ? "whitespace-pre-wrap" : "prose dark:prose-invert max-w-none"
    }
  >
    {isUser ? (
      text
    ) : (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    )}
  </div>
);

const Thinking = () => (
  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
    <svg
      className="h-6 w-6 animate-spin mr-2"
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
    thinking…
  </div>
);

// ChatInput component MODIFIED
function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  chatMode,
  onModeChange,
  isFixed = true, // Default to true
}: ChatInputProps) {
  const toggleMode = () => {
    onModeChange(chatMode === "analysis" ? "audit" : "analysis");
  };

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
      if (value.trim() && !disabled) {
        onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
    // Allow Shift+Enter to insert a new line (default behavior)
  };

  const wrapperClasses = isFixed
    ? "fixed bottom-6 left-6 right-6 z-10" // Removed background and border, added margin from edges
    : "w-full"; // When not fixed, parent controls width/centering

  const formClasses = `flex relative ${
    isFixed ? "max-w-4xl mx-auto" : "max-w-4xl mx-auto" // Consistent max-width
  }`;

  return (
    <div className={wrapperClasses}>
      <form onSubmit={onSubmit} className={formClasses}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="How can Rio Help?"
          disabled={disabled}
          rows={1}
          className={`w-full px-6 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl outline-none resize-none leading-tight align-middle overflow-hidden text-white placeholder-gray-500 shadow-2xl ${
            isFixed
              ? "py-5 min-h-[80px] max-h-[200px]" // Increased from py-4 and min-h-[60px]
              : "py-6 min-h-[80px] max-h-[200px] text-lg" // Increased from py-5 and min-h-[70px]
          }`}
        />
        <div
          className={`absolute flex items-center space-x-2 ${
            isFixed ? "right-6 bottom-7" : "right-6 bottom-8" // Adjusted for taller input
          }`}
        >
          <button
            type="button"
            onClick={toggleMode}
            disabled={disabled}
            className={`h-8 px-4 rounded-full text-xs font-medium transition-all duration-200 flex items-center cursor-pointer ${
              chatMode === "audit"
                ? "bg-[#1d3a5a] text-[#5aaff9] hover:bg-[#2a4a6d]"
                : "bg-gray-800 text-gray-200 hover:bg-gray-700"
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
            disabled={disabled || !value.trim()}
            className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm ${
              disabled || !value.trim()
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
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
      </form>

      {/* Disclaimer message */}
      <div className="text-center mt-1 mb-1">
        <p className="text-xs font-semibold text-gray-300/50">
          Rio can make mistakes. Check important info.
        </p>
      </div>
    </div>
  );
}
