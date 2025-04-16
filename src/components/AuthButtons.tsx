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
      {/* {isAuthenticated ? ( */}
        <button
          onClick={handleChatRedirect}
          className="inline-block px-8 py-3 bg-blue-50 dark:bg-gray-800 text-blue-600 dark:text-white rounded-full font-semibold hover:bg-blue-100 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-400 cursor-pointer"
        >
          Go to Chat
        </button>
      {/* ) : ( */}
        {/* <>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-3 bg-blue-50 dark:bg-gray-800 text-blue-600 dark:text-white rounded-full font-semibold hover:bg-blue-100 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-400 cursor-pointer"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 border-2 border-white cursor-pointer"
          >
            Sign Up
          </Link>
        </> */}
      {/* )} */}
    </div>
  );
}
