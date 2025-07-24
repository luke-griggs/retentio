"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  Bars3Icon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  TrashIcon,
  PencilIcon,
  ChevronDoubleLeftIcon,
  DocumentTextIcon,
  CogIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface ChatHistory {
  id: string;
  title: string;
  timestamp: Date;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [isHovering, setIsHovering] = useState(false);

  // Mock chat history - replace with actual data
  useEffect(() => {
    setChatHistory([
      {
        id: "1",
        title: "Email Campaign Analysis",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        id: "2",
        title: "Brand Strategy Discussion",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
      {
        id: "3",
        title: "Content Calendar Review",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
      {
        id: "4",
        title: "Klaviyo Integration Help",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      },
      {
        id: "5",
        title: "Shopify Data Export",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
    ]);
  }, []);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  // Show logo button when sidebar is closed
  if (!isOpen) {
    return (
      <motion.div
        className="fixed left-4 top-4 z-50"
        onHoverStart={() => setIsHovering(true)}
        onHoverEnd={() => setIsHovering(false)}
        onClick={onToggle}
      >
        <motion.button
          className="w-12 h-12 bg-gray-800 rounded-lg shadow-lg border border-gray-700 flex items-center justify-center cursor-pointer transition-all duration-200 hover:shadow-xl"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bars3Icon className="w-6 h-6 text-gray-300" />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: -320 }}
        animate={{ x: 0 }}
        exit={{ x: -320 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed left-0 top-0 h-full w-80 bg-gray-900 z-40 flex flex-col border-r border-gray-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <Link href="/" className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white">RIO</h1>
          </Link>
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => {
                /* New chat handler */
              }}
            ></motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              onClick={onToggle}
            >
              <ChevronDoubleLeftIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Copy Mode - Subtle */}
        <div className="px-4 py-2 group">
          <Link href="/copy-mode">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full text-left text-sm py-2 px-2 rounded-md transition-all duration-200 hover:bg-gray-800/50"
            >
              <div className="group-hover:opacity-100 transition-opacity flex items-center text-white">
                <DocumentTextIcon className="w-5 h-5 mr-2 text-white" />
                Copy Mode
              </div>
            </motion.button>
          </Link>
        </div>
        {/* Prompt Warehouse - Subtle */}
        <div className="px-4 pb-2 group">
          <Link href="/prompt-warehouse">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full text-left text-sm py-2 px-2 rounded-md transition-all duration-200 hover:bg-gray-800/50"
            >
              <div className="group-hover:opacity-100 transition-opacity flex items-center text-white">
                <CogIcon className="w-5 h-5 mr-2 text-white" />
                Prompt Warehouse
              </div>
            </motion.button>
          </Link>
        </div>
        <div className="px-4 pb-2 group">
          <Link href="/prompt-lab">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full text-left text-sm py-2 px-2 rounded-md transition-all duration-200 hover:bg-gray-800/50"
            >
              <div className="group-hover:opacity-100 transition-opacity flex items-center text-white">
                <BeakerIcon className="w-5 h-5 mr-2 text-white" />
                Prompt Lab
              </div>
            </motion.button>
          </Link>
        </div>

        {/* Chat History */}
        {/* <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {chatHistory.map((chat, index) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <Link
                  href={`/chat/${chat.id}`}
                  className="flex items-center p-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <ChatBubbleLeftIcon className="w-4 h-4 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {chat.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(chat.timestamp)}
                    </div>
                  </div>
                </Link>

                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1 text-gray-500 hover:text-white rounded"
                    onClick={(e) => {
                      e.preventDefault();
                      // Handle rename
                    }}
                  >
                    <PencilIcon className="w-3 h-3" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1 text-gray-500 hover:text-red-400 rounded"
                    onClick={(e) => {
                      e.preventDefault();
                      // Handle delete
                    }}
                  >
                    <TrashIcon className="w-3 h-3" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div> */}

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-500 text-center">
            Retentio AI Assistant
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
