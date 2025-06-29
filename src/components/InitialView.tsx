"use client";

import Image from "next/image";
import { ChatInput, ChatInputProps } from "@/components/ChatInput";

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

export function InitialView({ fillExample, chatInputProps }: InitialViewProps) {
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
          src="/rio.png"
          alt="Rio"
          width={160}
          height={160}
          className="mb-6 rounded-full shadow-2xl"
        />
        <h2 className="text-6xl md:text-7xl font-black mb-8 text-shadow-lg tracking-tight">
          Hello, I'm <span className="text-yellow-400 italic">RIO</span>
        </h2>
        <p className="text-lg md:text-xl text-gray-200 mb-8 font-medium">
          Designed to help you serve{" "}
          <span className="font-black italic">RETENTIO</span> clients.
        </p>

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
