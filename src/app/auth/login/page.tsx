import { login } from "../actions";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-md mx-auto flex flex-col items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-10 w-full sm:w-[440px] border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Enter Your Credentials
          </h2>

          <form className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex flex-col space-y-3 pt-4">
              <button
                formAction={login}
                className="w-full flex justify-center py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold"
              >
                Sign In
              </button>
              <Link
                href="/auth/register"
                className="w-full flex justify-center py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-blue-500 dark:text-blue-400 bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold"
              >
                Create Account
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
