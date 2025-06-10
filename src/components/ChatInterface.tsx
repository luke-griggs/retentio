// app/components/ChatInterface.tsx
"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import { useMessages } from "@/hooks/use-messages";
import {
  MessageBubble,
  Thinking,
  MessagePart,
} from "@/components/MessageComponents";
import { InitialView } from "@/components/InitialView";
import {
  ChatInput,
  ChatInputProps,
  AttachedFile,
} from "@/components/ChatInput";
import { getToolResult } from "@/app/utils/chat";

// Custom scrollbar styles
const scrollbarStyles = `
  /* Prevent system dark mode from interfering */
  .chat-interface {
    color-scheme: light;
    forced-color-adjust: none;
  }
  
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
  
  /* Force consistent text colors regardless of system theme */
  .chat-interface * {
    color-scheme: light;
  }
  
  /* Ensure markdown prose styling works consistently */
  .prose-invert {
    color: #e5e7eb !important;
  }
  
  .prose-invert h1, .prose-invert h2, .prose-invert h3, .prose-invert h4, .prose-invert h5, .prose-invert h6 {
    color: #f9fafb !important;
  }
  
  .prose-invert strong {
    color: #f9fafb !important;
  }
  
  .prose-invert a {
    color: #fbbf24 !important;
  }
  
  .prose-invert code {
    color: #fbbf24 !important;
    background-color: rgba(55, 65, 81, 0.5) !important;
  }
  
  .prose-invert table {
    color: #e5e7eb !important;
  }
  
  .prose-invert th {
    color: #f9fafb !important;
    border-color: #4b5563 !important;
  }
  
  .prose-invert td {
    border-color: #4b5563 !important;
  }
`;

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

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

  // Wrap handleSubmit to include chatMode and handle file attachments
  const handleSubmit = (
    e: React.FormEvent<HTMLFormElement>,
    attachedFiles?: AttachedFile[]
  ) => {
    e.preventDefault();

    // Convert AttachedFile[] to the format expected by Vercel AI SDK
    const experimental_attachments = attachedFiles?.map((af) => ({
      name: af.file.name,
      contentType: af.file.type,
      url: af.fileUrl,
    }));

    // Use the Vercel AI SDK's experimental_attachments feature
    originalHandleSubmit(e, {
      experimental_attachments,
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
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#1A2030] via-[#3a5a8a] to-[#2e4a6f] relative overflow-hidden chat-interface">
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
