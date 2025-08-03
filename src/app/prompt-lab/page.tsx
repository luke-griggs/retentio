import { PromptLabInterface } from '@/components/prompt-lab/PromptLabInterface';
import Link from 'next/link';
import { HomeIcon } from '@heroicons/react/24/outline';

export default function PromptLabPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-semibold text-white">Prompt Lab</h1>
        <Link href="/">
          <button className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
            <HomeIcon className="w-4 h-4 flex-shrink-0" />
            <span>Return to Home</span>
          </button>
        </Link>
      </header>
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <PromptLabInterface />
        </div>
      </main>
    </div>
  );
}