import Link from "next/link";

interface NavbarProps {
  // Optional props can be added here in the future
}

export default function Navbar({}: NavbarProps) {
  return (
    <header className="py-4 border-b border-[#15693A]">
      <div className="flex justify-between items-center p-2">
        <Link href="/">
          <h1 className="text-2xl font-black cursor-pointer pl-2">RETENTIO</h1>
        </Link>
      </div>
    </header>
  );
}
