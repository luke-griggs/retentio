"use client";

import { forwardRef } from "react";
import ReactMarkdownBase from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChartRenderer } from "@/components/ChartRenderer";
import DbTable from "@/components/DbTable";
import { getToolResult } from "@/app/utils/chat";

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
  image?: string; // For image attachments
  toolInvocation?: {
    toolCallId?: string;
    toolName?: string;
    args?: any;
    state?: any;
    result?: any;
  };
  reasoning?: string;
}

interface BubbleProps {
  message: any;
  requiresScrollPadding: boolean;
}

interface FileAttachment {
  name: string;
  url: string;
  contentType?: string;
}

// React 19's stricter JSXElementConstructor no longer recognises the function
// signature returned by the default export of `react-markdown`. We provide a
// lightweight wrapper that forwards all props but has an explicit React.FC
// signature, making it compatible with JSX usage.
const ReactMarkdown: React.FC<
  React.ComponentProps<typeof ReactMarkdownBase>
> = (props) => <ReactMarkdownBase {...props} />;

export const MessageBubble = forwardRef<HTMLDivElement, BubbleProps>(
  ({ message, requiresScrollPadding }, ref) => {
    // Extract file attachments from message if they exist
    const attachments: FileAttachment[] =
      message.experimental_attachments || [];

    return (
      <div
        ref={ref}
        data-message-role={message.role}
        className={`w-full max-w-[94%] mx-auto px-2 pl-5 flex ${
          message.role === "assistant" && requiresScrollPadding
            ? "min-h-96"
            : ""
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
          {/* Show file attachments for user messages */}
          {message.role === "user" && attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((attachment, idx) => {
                const isImage = attachment.contentType?.startsWith("image/");
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-yellow-600/20 border border-yellow-600/30 rounded-lg px-3 py-1.5 text-xs"
                  >
                    {isImage ? (
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" />
                      </svg>
                    ) : (
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                      </svg>
                    )}
                    <span className="max-w-[150px] truncate">
                      {attachment.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

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

            /* -------- image attachments -------- */
            if (part.type === "image" && part.image) {
              return (
                <div key={`image-${i}`} className="my-2">
                  <img
                    src={part.image}
                    alt="Attached image"
                    className="max-w-full rounded-lg"
                  />
                </div>
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
    );
  }
);
MessageBubble.displayName = "MessageBubble";

export const MarkdownText = ({
  text,
  isUser,
}: {
  text: string;
  isUser: boolean;
}) => (
  <div
    className={isUser ? "whitespace-pre-wrap" : "prose prose-invert max-w-none"}
  >
    {isUser ? (
      text
    ) : (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    )}
  </div>
);

export const Thinking = () => (
  <div className="flex items-center text-sm text-gray-400">
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
