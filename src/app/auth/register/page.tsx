"use client";

import { signup } from "../actions";
import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleSubmit = (formData: FormData) => {
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    // Clear any error and proceed with signup
    setPasswordError("");
    signup(formData);
  };

  return (
    <main className="min-h-screen bg-[#4285f4] p-4">
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center">
        <Link
          href="/"
          className="text-6xl font-bold text-white text-center mb-12 italic hover:opacity-90 transition-opacity absolute top-8"
        >
          RETENTIO
        </Link>

        <div className="bg-white rounded-xl shadow-xl p-10 w-[440px]">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Create Your Account
          </h2>

          <form className="space-y-6" action={handleSubmit}>
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
                className="w-full px-4 py-3 border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                placeholder="Enter your password"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordError && e.target.value === password) {
                    setPasswordError("");
                  }
                }}
                className={`w-full px-4 py-3 border rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 ${
                  passwordError ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="Confirm your password"
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
              )}
            </div>

            <div className="flex flex-col space-y-3 pt-4">
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-6 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-semibold"
              >
                Create Account
              </button>
              <div className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/auth/login"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
