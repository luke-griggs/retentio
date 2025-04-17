import Link from "next/link";

// Use Record<string, never> instead of empty interface
// or add a comment to disable the linter warning
type NavbarProps = Record<string, never>;

export default function Navbar({}: NavbarProps) {
  return (
    <header className="w-full py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white fixed top-0 left-0 right-0 z-20">
      <div className="flex items-center">
        <div className="flex items-center space-x-6 p-2">
          <Link href="/">
            <h1 className="text-2xl font-black cursor-pointer pl-8">
              RIO
            </h1>
          </Link>
          {/* <div className="h-6 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
          <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
            AGENT
          </span> */}
        </div>
      </div>
    </header>
  );
}
