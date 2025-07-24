import { PromptLabInterface } from '@/components/prompt-lab/PromptLabInterface';

export default function PromptLabPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
        <h1 className="text-2xl font-semibold text-white">Prompt Lab</h1>
      </header>
      <main className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <PromptLabInterface />
        </div>
      </main>
    </div>
  );
}