import { readUserSession } from "./auth/actions";
import AuthButtons from "@/components/AuthButtons";
import { redirect } from "next/navigation";

export default async function Home() {
  const { data } = await readUserSession();
  const isAuthenticated = !!data.user;

  return (
    <main className="min-h-screen bg-[#4285f4] p-4">
      <div className="max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold text-white text-center mb-8 italic">
          RETENTIO
        </h1>

        <p className="text-xl text-white text-center mb-8 max-w-2xl">
          Your AI-powered marketing strategy assistant. Get insights,
          recommendations, and answers to all your marketing questions.
        </p>

        <AuthButtons isAuthenticated={isAuthenticated} />
      </div>
    </main>
  );
}
