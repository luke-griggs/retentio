import { readUserSession } from "./auth/actions";
import AuthButtons from "@/components/AuthButtons";
import ChatInterface from "@/components/ChatInterface";

export default async function Home() {
  const { data } = await readUserSession();
  const isAuthenticated = !!data.user;

  return (
    <main className="min-h-screen bg-white">
      {isAuthenticated ? (
        <div className="container mx-auto">
          <header className="py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">RETENTIO</h1>
              <AuthButtons isAuthenticated={isAuthenticated} />
            </div>
          </header>
          <ChatInterface />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center bg-[#4285f4] p-4">
          <h1 className="text-6xl font-bold text-white text-center mb-8 italic">
            RETENTIO
          </h1>

          <p className="text-xl text-white text-center mb-8 max-w-2xl">
            Your AI-powered marketing strategy assistant. Get insights,
            recommendations, and answers to all your marketing questions.
          </p>

          <AuthButtons isAuthenticated={isAuthenticated} />
        </div>
      )}
    </main>
  );
}
