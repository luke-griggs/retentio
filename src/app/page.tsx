import { readUserSession } from "./auth/actions";
import AuthButtons from "@/components/AuthButtons";
import ChatInterface from "@/components/ChatInterface";
import Navbar from "@/components/Navbar";

export default async function Home() {
  const { data } = await readUserSession();
  const isAuthenticated = !!data.user;

  return (
    <main className="min-h-screen bg-[#050E08]">
      {isAuthenticated ? (
        <div className="container mx-auto h-screen flex flex-col">
          <Navbar />

          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <h2 className="text-6xl font-bold text-[#2fbf6d] mb-8">
              RETENTIO BRAIN
            </h2>
            <p className="text-xl text-[#d1e9db] max-w-2xl mb-10">
              Welcome to Retentio's AI-powered assistant.
            </p>
            <AuthButtons isAuthenticated={isAuthenticated} />
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center bg-[#050E08] p-4">
          <h1 className="text-6xl font-bold text-[#208C4F] text-center mb-8 italic">
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
