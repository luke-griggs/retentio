"use client";

import Navbar from "@/components/Navbar";

export default function ErrorPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Error
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Sorry, something went wrong during authentication. Please try again.
          </p>
        </div>
      </div>
    </main>
  );
}
