import { readUserSession } from "../auth/actions";
import { redirect } from "next/navigation";
import ChatInterface from "@/components/ChatInterface";

export default async function ChatPage() {
  // Check authentication on the server
  const { data } = await readUserSession();

  // Redirect if not authenticated
  // if (!data.user) {
  //   redirect("/auth/login");
  // }

  // User is authenticated, render the chat interface
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <ChatInterface />
    </main>
  );
}
