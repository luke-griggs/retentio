import { readUserSession } from "./auth/actions";
import AuthButtons from "@/components/AuthButtons";
import Navbar from "@/components/Navbar";

export default async function Home() {
  const { data } = await readUserSession();
  const isAuthenticated = !!data.user;

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      {isAuthenticated ? (
        <div className="max-w-5xl mx-auto h-[calc(100vh-6rem)] flex flex-col items-center justify-center px-4 text-center">
          <h2 className="text-6xl font-bold text-blue-500 mb-8">
            RETENTIO BRAIN
          </h2>
          <p className="text-xl font-semibold text-gray-500 dark:text-gray-300 max-w-2xl mb-10">
            Welcome to Retentio&apos;s AI-powered assistant.
          </p>
          <AuthButtons isAuthenticated={isAuthenticated} />
        </div>
      ) : (
        <div className="max-w-4xl mx-auto min-h-[calc(100vh-6rem)] flex flex-col items-center justify-center p-4">
          <h1 className="text-6xl font-bold text-blue-500 text-center mb-8 italic">
            RETENTIO
          </h1>

          <p className="text-xl text-gray-500 dark:text-gray-300 text-center mb-8 max-w-2xl">
            Your AI-powered marketing strategy assistant. Get insights,
            recommendations, and answers to all your marketing questions.
          </p>

          <AuthButtons isAuthenticated={isAuthenticated} />
        </div>
      )}
    </main>
  );
}
