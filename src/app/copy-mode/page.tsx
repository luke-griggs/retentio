import { readUserSession } from "../auth/actions";
import { redirect } from "next/navigation";
import CopyModeInterface from "@/components/copy-mode/CopyModeInterface";
import ChatLayout from "@/components/ChatLayout";

export default async function CopyModePage() {
  // Check authentication on the server
  const { data } = await readUserSession();

  // Redirect if not authenticated
  // if (!data.user) {
  //   redirect("/auth/login");
  // }

  // User is authenticated, render the copy mode interface
  return (
    <ChatLayout hideSidebar={true}>
      <main className="min-h-screen bg-gray-900">
        <CopyModeInterface />
      </main>
    </ChatLayout>
  );
}
