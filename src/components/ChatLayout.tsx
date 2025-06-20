"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main content */}
      <motion.div
        animate={{
          marginLeft: isSidebarOpen ? 320 : 0,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="h-full transition-all duration-300 ease-in-out"
      >
        {children}
      </motion.div>
    </div>
  );
}
