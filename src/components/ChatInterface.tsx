// app/components/ChatInterface.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useCallback, forwardRef } from "react";
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
    result?: any
  };
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ChatInterface() {
  /* --------------------------- chat state -------------------------- */
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
        {isLoading && messages.at(-1)?.role === "user" && <Thinking />}
      </div>

      {/* --------------------------- input -------------------------- */}
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        disabled={isLoading}
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
        {message.parts.map((part: MessagePart, i: number) => {
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

          /* -- tool invocation placeholder (spinner) -- */
          if (part.type === "tool-invocation" && loading && isLast) {
            return <Thinking key={`thinking-${i}`} />;
          }

          /* -------- generic tool result (chart / db table) -------- */
          if (part.type === "tool-invocation" && !loading) {   
          const res = getToolResult(part as MessagePart);
          console.log("HERE IS THE RESULT",res);
          if (res?.spec) {
            return <ChartRenderer key={`chart-${i}`} spec={res.spec} />;
          }


          if (res?.db) {
            return (
              <DbTable key={`db-${i}`} results={res.db as DatabaseResult[]} />
            );
          }

          return null;
        }
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
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
}

function ChatInput({ value, onChange, onSubmit, disabled }: ChatInputProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-10">
      <form onSubmit={onSubmit} className="flex max-w-5xl mx-auto p-4">
        <input
          value={value}
          onChange={onChange}
          placeholder="Message Rio…"
          disabled={disabled}
          className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 border rounded-l-full outline-none"
        />
        <button
          type="submit"
          disabled={disabled}
          className={`px-6 py-4 rounded-r-full text-white ${
            disabled ? "bg-blue-400/50" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          ➤
        </button>
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
        I can help you analyze and interact with Retentio’s database
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
