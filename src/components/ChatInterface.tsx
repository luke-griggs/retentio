// app/components/ChatInterface.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useCallback, forwardRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";

import { ChartRenderer } from "@/components/ChartRenderer";
import DbTable from "@/components/DbTable";
import { getToolResult } from "@/app/utils/chat";

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
  } = useChat({
    api: "/api/chat",
    maxSteps: 15,
    body: {
      chatMode,
    },
  });

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

  /* ----------------------- scroll-to-bottom ----------------------- */
  const lastMsgRef = useRef<HTMLDivElement | null>(null);

  const scrollToLatest = useCallback(() => {
    if (!lastMsgRef.current) return;
    requestAnimationFrame(() => {
      window.scrollTo({
        top: lastMsgRef.current!.offsetTop,
        behavior: "smooth",
      });
    });
  }, []);

  useEffect(() => {
    if (messages.length) scrollToLatest();
  }, [messages, scrollToLatest]);

  /* --------------------------- helpers ---------------------------- */
  const fillExample = (text: string) => setInput(text);

  /* ---------------------------- render ---------------------------- */
  return (
    <div className="min-h-screen max-w-5xl mx-auto pb-24">
      <div className="p-6 space-y-6">
        {/* ---------- welcome pane (only when no messages) ---------- */}
        {messages.length === 0 && <Welcome fillExample={fillExample} />}

        {/* ----------------------- chat stream ---------------------- */}
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            ref={idx === messages.length - 1 ? lastMsgRef : null}
            message={msg}
            isLast={idx === messages.length - 1}
            loading={isLoading}
          />
        ))}

        {/* -------- loading stub immediately after user sends -------- */}
        {isLoading && <Thinking />}
      </div>

      {/* --------------------------- input -------------------------- */}
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        disabled={isLoading}
        chatMode={chatMode}
        onModeChange={setChatMode}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Child components                                                   */
/* ------------------------------------------------------------------ */

interface BubbleProps {
  message: any;
  isLast: boolean;
  loading: boolean;
}

const MessageBubble = forwardRef<HTMLDivElement, BubbleProps>(
  ({ message, isLast, loading }, ref) => (
    <div
      ref={ref}
      className={`flex ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`max-w-[80%] rounded-2xl p-4 ${
          message.role === "user"
            ? "bg-blue-50 dark:bg-gray-800 rounded-tr-none"
            : "bg-none rounded-tl-none"
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

interface ChatInputProps {
  value: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  chatMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  chatMode,
  onModeChange,
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

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-10">
      <form onSubmit={onSubmit} className="flex max-w-5xl mx-auto p-4 relative">
        {/* Text area for input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="How can Rio Help?"
          disabled={disabled}
          rows={1}
          className="w-full py-4 px-4 bg-gray-900 border border-gray-800 rounded-xl outline-none min-h-[60px] max-h-[200px] resize-none leading-tight align-middle overflow-hidden text-white"
        />

        {/* Buttons container - positioned to the right */}
        <div className="absolute right-6 bottom-6 flex items-center space-x-2">
          {/* Mode Toggle Button */}
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

          {/* Send Button - Styled as round white button */}
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm
              ${
                disabled || !value.trim()
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-white text-black hover:bg-gray-100 cursor-pointer hover:scale-105 transition-transform"
              } transition-colors`}
          >
            {/* Arrow icon */}
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
    </div>
  );
}

function Welcome({ fillExample }: { fillExample: (t: string) => void }) {
  const examples = [
    "Which campaigns had the most conversions in April 2025?",
    "Which campaign subject lines generated the most unique clicks?",
    "Why might our best-performing flows be doing well?",
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
      <Image
        src="/rio.png"
        alt="Rio"
        width={100}
        height={100}
        className="mb-4 rounded-full mx-auto"
      />
      <h2 className="text-4xl font-bold mb-2">Rio</h2>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
        I can help you analyze and interact with Retentio's database
      </p>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg max-w-lg mx-auto">
        <h3 className="text-xl font-semibold text-blue-400 mb-4">
          Try these examples:
        </h3>
        <div className="space-y-3">
          {examples.map((ex) => (
            <div
              key={ex}
              onClick={() => fillExample(ex)}
              className="cursor-pointer bg-gray-100 dark:bg-gray-900 p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {ex}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
