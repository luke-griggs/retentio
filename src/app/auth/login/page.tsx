import { login, signup } from "../actions";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#050E08] p-4">
      <header className="py-4 border-b border-[#15693A]">
            <div className="flex justify-between items-center p-2">
              <h1 className="text-2xl font-black">RETENTIO</h1>
            </div>
          </header>
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl p-10 w-[440px]">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Enter Your Credentials
          </h2>

          <form className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#208C4F] focus:border-transparent text-gray-900 placeholder-gray-500"
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#208C4F] focus:border-transparent text-gray-900 placeholder-gray-500"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex flex-col space-y-3 pt-4">
              <button
                formAction={login}
                className="w-full flex justify-center py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-white bg-[#208C4F] hover:bg-[#15693A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#208C4F] font-semibold"
              >
                Sign In
              </button>
              <Link
                href="/auth/register"
                className="w-full flex justify-center py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-[#208C4F] bg-white border-2 border-[#208C4F] hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#208C4F] font-semibold"
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
