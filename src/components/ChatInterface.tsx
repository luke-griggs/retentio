"use client";

import { useState, useRef, useEffect } from "react";

// Message type definition
type Message = {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  toolCall?: {
    toolName: string;
    toolData: any;
  };
};

// Chat hook
function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (message: string) => {
    setIsLoading(true);
    try {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: message,
        role: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Simulate AI response
      setTimeout(() => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content:
            "This is a mock response. The real AI integration will be implemented later.",
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (err) {
      setError("Failed to send message");
      setIsLoading(false);
    }
  };

  const clearMessages = () => setMessages([]);

  return { messages, isLoading, error, sendMessage, clearMessages };
}

export default function ChatInterface() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput("");
    }
  };

  return (
    <main className="min-h-screen bg-[#4285f4] p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8 italic">
          RETENTIO
        </h1>

        <div className="bg-white rounded-xl shadow-xl p-4">
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about marketing strategy..."
                className="w-full p-4 pr-20 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-12 text-black placeholder-gray-500"
                disabled={isLoading}
              />
              <svg
                className="absolute left-4 w-5 h-5 text-gray-400"
                fill="none"
                strokeWidth="2"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2 mb-6">
            {[
              "Strategy",
              "Client",
              "Wireframing",
              "Copywriting",
              "Design",
              "Technical Deployment",
            ].map((category) => (
              <button
                key={category}
                className="px-4 py-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
              >
                {category}
              </button>
            ))}
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-gray-100 rounded-tl-none"
                  }`}
                >
                  <div className="text-sm">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === "user"
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-pulse">Thinking...</div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-200"></div>
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg">
                Error: {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </main>
  );
}
