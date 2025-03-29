import { readUserSession } from "../auth/actions";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";
import Navbar from "@/components/Navbar";

export default async function ChatPage() {
  // Check authentication on the server
  const { data } = await readUserSession();

  // Redirect if not authenticated
  if (!data.user) {
    redirect("/auth/login");
  }

  // User is authenticated, render the chat interface
  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
      <Navbar />
      <div className="flex-1 pt-20">
        <ChatInterface />
      </div>
    </main>
  );
}
