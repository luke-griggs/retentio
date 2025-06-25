"use client";

interface Campaign {
  id: string;
  name: string;
  description: string;
  updated_at: string;
}

interface EmailEditChatProps {
  campaign: Campaign;
  emailContent: string;
  onContentChange: (content: string) => void;
}

export default function EmailEditChat({
  campaign,
  emailContent,
  onContentChange,
}: EmailEditChatProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="text-center text-gray-500 mt-8">
          <p className="text-sm">AI-powered email editing coming soon...</p>
          <p className="text-xs mt-2">
            This feature will allow you to edit emails using natural language
            commands
          </p>
        </div>
      </div>

      <div className="p-4 border-t border-gray-700">
        <input
          type="text"
          placeholder="Type your editing request..."
          disabled
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 opacity-50 cursor-not-allowed"
        />
      </div>
    </div>
  );
}
