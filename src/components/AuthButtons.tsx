"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type AuthButtonsProps = {
  isAuthenticated: boolean;
};

export default function AuthButtons({ isAuthenticated }: AuthButtonsProps) {
  const router = useRouter();

  const handleChatRedirect = () => {
    router.push("/chat");
  };

  return (
    <div className="space-x-4">
      {isAuthenticated ? (
        <button
          onClick={handleChatRedirect}
          className="inline-block px-8 py-3 bg-white text-blue-600 rounded-full font-semibold hover:bg-blue-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
        >
          Go to Chat
        </button>
      ) : (
        <>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 bg-white text-blue-600 rounded-full font-semibold hover:bg-blue-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 border-2 border-white"
          >
            Sign Up
          </Link>
        </>
      )}
    </div>
  );
}
