"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Bars3Icon,
  ChevronDoubleLeftIcon,
  CogIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ChatBubbleBottomCenterTextIcon,
  PhoneIcon,
  PhotoIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";

interface Store {
  id: string;
  name: string;
  clickup_list_id: string;
}

interface GlobalPromptType {
  id: string;
  name: string;
  icon: any;
}

type StoreContentType = "cartridge" | "examples";

const globalPromptTypes: GlobalPromptType[] = [
  { id: "designed-email", name: "Designed Email", icon: DocumentTextIcon },
  {
    id: "plain-text",
    name: "Plain Text",
    icon: ChatBubbleBottomCenterTextIcon,
  },
  { id: "sms", name: "SMS", icon: PhoneIcon },
  { id: "mms", name: "MMS", icon: PhotoIcon },
];

export default function PromptWarehouseInterface() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedGlobalPrompt, setSelectedGlobalPrompt] =
    useState<GlobalPromptType | null>(null);
  const [selectedStoreContentType, setSelectedStoreContentType] =
    useState<StoreContentType | null>(null);
  const [storeContent, setStoreContent] = useState("");
  const [isLoadingStoreContent, setIsLoadingStoreContent] = useState(false);
  const [storeContentError, setStoreContentError] = useState<string | null>(
    null
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isGlobalPromptingExpanded, setIsGlobalPromptingExpanded] =
    useState(false);
  const [isPerBrandExpanded, setIsPerBrandExpanded] = useState(false);

  // New state for editing functionality
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [globalPromptContent, setGlobalPromptContent] = useState("");
  const [isLoadingGlobalPrompt, setIsLoadingGlobalPrompt] = useState(false);

  const isStoreContentSelected =
    selectedStore !== null && selectedStoreContentType !== null;
  const isCartridgeView = selectedStoreContentType !== "examples";
  const StoreContentIcon = isCartridgeView
    ? DocumentTextIcon
    : ChatBubbleBottomCenterTextIcon;
  const storeContentTitleSuffix = isCartridgeView
    ? "Brand Cartridge"
    : "Email Examples";
  const storeContentSubtitle = isCartridgeView
    ? "Brand-specific content and guidelines"
    : "Example emails used to guide copywriting";
  const storeContentTitle = selectedStore
    ? `${selectedStore.name} - ${storeContentTitleSuffix}`
    : storeContentTitleSuffix;
  const storeContentPlaceholder = isCartridgeView
    ? "Enter your brand cartridge content here..."
    : "Enter example emails here...";
  const emptyStoreContentMessage = isCartridgeView
    ? "No cartridge content available for this brand."
    : "No email examples available for this brand.";

  // Fetch stores
  useEffect(() => {
    fetchStores();
  }, []);

  // Fetch global prompt content when a global prompt is selected
  useEffect(() => {
    if (selectedGlobalPrompt) {
      fetchGlobalPromptContent(selectedGlobalPrompt.id);
    }
  }, [selectedGlobalPrompt]);

  const fetchStores = async () => {
    try {
      setIsLoadingStores(true);
      setStoreError(null);

      const response = await fetch("/api/clickup/fetch-stores");
      if (!response.ok) {
        throw new Error("Failed to fetch stores");
      }

      const data = await response.json();
      setStores(data.stores);
    } catch (err) {
      console.error("Error fetching stores:", err);
      setStoreError("Failed to load stores");
    } finally {
      setIsLoadingStores(false);
    }
  };

  const fetchStoreContent = async (
    storeId: string,
    contentType: StoreContentType
  ) => {
    try {
      setIsLoadingStoreContent(true);
      setStoreContentError(null);
      setSelectedStoreContentType(contentType);
      setStoreContent("");

      const endpoint =
        contentType === "cartridge"
          ? `/api/clickup/fetch-cartridges/${storeId}`
          : `/api/prompt-warehouse/store-examples/${storeId}`;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${
            contentType === "cartridge" ? "cartridge" : "email examples"
          }`
        );
      }

      const data = await response.json();

      if (contentType === "cartridge") {
        setStoreContent(data.cartridge?.content || "");
      } else {
        setStoreContent(data.emailExamples || "");
      }
    } catch (err) {
      console.error(`Error fetching ${contentType}:`, err);
      setStoreContent("");
      setStoreContentError(
        `Failed to load ${
          contentType === "cartridge" ? "cartridge" : "email examples"
        }`
      );
    } finally {
      setIsLoadingStoreContent(false);
    }
  };

  const fetchGlobalPromptContent = async (promptType: string) => {
    try {
      setIsLoadingGlobalPrompt(true);

      const response = await fetch(
        `/api/prompt-warehouse/global-prompts/${promptType}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch global prompt");
      }

      const data = await response.json();
      setGlobalPromptContent(data.content || "");
    } catch (err) {
      console.error("Error fetching global prompt:", err);
      setGlobalPromptContent("");
    } finally {
      setIsLoadingGlobalPrompt(false);
    }
  };

  const handleStoreClick = (store: Store) => {
    if (selectedStore?.id === store.id) {
      // Clicking on already selected store collapses it
      setSelectedStore(null);
      setSelectedStoreContentType(null);
      setStoreContent("");
      setStoreContentError(null);
    } else {
      // Select new store but don't fetch cartridge automatically
      setSelectedStore(store);
      setSelectedStoreContentType(null);
      setStoreContent("");
      setStoreContentError(null);
    }
    // Reset editing state when switching
    setIsEditing(false);
    setEditContent("");
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleCartridgeClick = (store: Store) => {
    setSelectedGlobalPrompt(null);
    fetchStoreContent(store.id, "cartridge");
    // Reset editing state when switching
    setIsEditing(false);
    setEditContent("");
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleExamplesClick = (store: Store) => {
    setSelectedGlobalPrompt(null);
    fetchStoreContent(store.id, "examples");
    setIsEditing(false);
    setEditContent("");
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleGlobalPromptClick = (prompt: GlobalPromptType) => {
    setSelectedGlobalPrompt(prompt);
    setSelectedStore(null);
    setSelectedStoreContentType(null);
    setStoreContent("");
    setStoreContentError(null);
    // Reset editing state when switching
    setIsEditing(false);
    setEditContent("");
    setSaveSuccess(null);
    setSaveError(null);
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleEdit = () => {
    if (selectedGlobalPrompt) {
      setEditContent(globalPromptContent);
    } else if (selectedStoreContentType) {
      setEditContent(storeContent || "");
    }
    setIsEditing(true);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent("");
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      if (selectedGlobalPrompt) {
        // Save global prompt
        const response = await fetch(
          `/api/prompt-warehouse/global-prompts/${selectedGlobalPrompt.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content: editContent }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to save global prompt");
        }

        // Update local state
        setGlobalPromptContent(editContent);
        setSaveSuccess("Global prompt saved successfully!");
      } else if (selectedStore && selectedStoreContentType) {
        const endpoint =
          selectedStoreContentType === "cartridge"
            ? `/api/prompt-warehouse/brand-cartridges/${selectedStore.id}`
            : `/api/prompt-warehouse/store-examples/${selectedStore.id}`;

        const response = await fetch(endpoint, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: editContent }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to save ${
              selectedStoreContentType === "cartridge"
                ? "brand cartridge"
                : "email examples"
            }`
          );
        }

        setStoreContent(editContent);
        setStoreContentError(null);
        setSaveSuccess(
          selectedStoreContentType === "cartridge"
            ? "Cartridge saved successfully!"
            : "Email examples saved successfully!"
        );
      }

      setIsEditing(false);
      setEditContent("");

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(null);
      }, 3000);
    } catch (err) {
      console.error("Error saving content:", err);
      setSaveError("Failed to save content. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Collapsed Sidebar Column */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 80, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="border-r border-gray-700 flex flex-col items-center pt-4"
          >
            <motion.button
              onClick={handleSidebarToggle}
              className="w-12 h-12 bg-gray-800 rounded-lg shadow-lg border border-gray-700 flex items-center justify-center cursor-pointer transition-all duration-200 hover:shadow-xl hover:bg-gray-700"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bars3Icon className="w-6 h-6 text-gray-300" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Column - Store Tree */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-80 border-r border-gray-700 flex flex-col"
          >
            <div className="p-4 pb-0 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-medium text-gray-300">
                  Prompt Warehouse
                </h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  onClick={handleSidebarToggle}
                >
                  <ChevronDoubleLeftIcon className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="flex-1">
                {/* GLOBAL PROMPTING Section */}
                <div className="py-2">
                  <motion.button
                    onClick={() =>
                      setIsGlobalPromptingExpanded(!isGlobalPromptingExpanded)
                    }
                    className="w-full flex items-center space-x-2 px-3 py-2 -mb-2text-left transition-colors hover:bg-gray-800"
                    whileHover={{ backgroundColor: "rgba(31, 41, 55, 0.8)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isGlobalPromptingExpanded ? (
                      <ChevronDownIcon className="w-5 h-5 flex-shrink-0 text-gray-300" />
                    ) : (
                      <ChevronRightIcon className="w-5 h-5 flex-shrink-0 text-gray-300" />
                    )}
                    <GlobeAltIcon className="w-5 h-5 flex-shrink-0 text-gray-300" />
                    <span className="text-gray-300 font-medium text-base">
                      GLOBAL PROMPTING
                    </span>
                  </motion.button>

                  <AnimatePresence>
                    {isGlobalPromptingExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="ml-6 border-l border-gray-700 pl-3 overflow-hidden"
                      >
                        {globalPromptTypes.map((prompt, index) => {
                          const IconComponent = prompt.icon;
                          return (
                            <motion.button
                              key={prompt.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02 }}
                              onClick={() => handleGlobalPromptClick(prompt)}
                              className={`w-full flex items-center space-x-2 px-2 py-1.5 text-xs text-left transition-colors hover:bg-gray-800 ${
                                selectedGlobalPrompt?.id === prompt.id
                                  ? "bg-gray-800 text-white"
                                  : "text-gray-400"
                              }`}
                              whileHover={{
                                backgroundColor: "rgba(31, 41, 55, 0.8)",
                              }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <IconComponent className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{prompt.name}</span>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Clients Header */}
                <div className="px-3 pt-4 border-t border-gray-700">
                  <h3 className="text-gray-300 font-medium text-base">
                    CLIENTS
                  </h3>
                </div>

                {/* List all brands (stores) in the root, no PER BRAND folder */}
                <div className="py-2">
                  {isLoadingStores && (
                    <div className="px-3 py-2 text-gray-400 text-sm">
                      Loading stores...
                    </div>
                  )}

                  {storeError && (
                    <div className="px-3 py-2 text-red-400 text-sm">
                      {storeError}
                    </div>
                  )}

                  {!isLoadingStores && !storeError && stores.length === 0 && (
                    <div className="px-3 py-2 text-gray-400 text-sm">
                      No stores available
                    </div>
                  )}

                  {!isLoadingStores &&
                    !storeError &&
                    stores.map((store, index) => (
                      <motion.div
                        key={store.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {/* Store Button */}
                        <motion.button
                          onClick={() => handleStoreClick(store)}
                          className={`w-full flex items-center space-x-2 px-3 py-1.5 text-sm text-left transition-colors hover:bg-gray-800 ${
                            selectedStore?.id === store.id
                              ? "bg-gray-800 text-white"
                              : "text-gray-300"
                          }`}
                          whileHover={{
                            backgroundColor: "rgba(31, 41, 55, 0.8)",
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {selectedStore?.id === store.id ? (
                            <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
                          )}
                          <FolderIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{store.name}</span>
                        </motion.button>

                        {/* Cartridge under selected store */}
                        <AnimatePresence>
                          {selectedStore?.id === store.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="ml-6 border-l border-gray-700 pl-3 overflow-hidden"
                            >
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="py-1 space-y-1"
                              >
                                <button
                                  className={`w-full flex items-center space-x-2 px-2 py-1.5 text-xs text-left transition-colors hover:bg-gray-800 ${
                                    selectedStore?.id === store.id &&
                                    selectedStoreContentType === "cartridge"
                                      ? "bg-gray-800 text-white"
                                      : "text-gray-400"
                                  }`}
                                  onClick={() => handleCartridgeClick(store)}
                                >
                                  <DocumentTextIcon className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {isLoadingStoreContent &&
                                    selectedStore?.id === store.id &&
                                    selectedStoreContentType === "cartridge"
                                      ? "Loading..."
                                      : "CARTRIDGE"}
                                  </span>
                                </button>
                                <button
                                  className={`w-full flex items-center space-x-2 px-2 py-1.5 text-xs text-left transition-colors hover:bg-gray-800 ${
                                    selectedStore?.id === store.id &&
                                    selectedStoreContentType === "examples"
                                      ? "bg-gray-800 text-white"
                                      : "text-gray-400"
                                  }`}
                                  onClick={() => handleExamplesClick(store)}
                                >
                                  <ChatBubbleBottomCenterTextIcon className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {isLoadingStoreContent &&
                                    selectedStore?.id === store.id &&
                                    selectedStoreContentType === "examples"
                                      ? "Loading..."
                                      : "EMAIL EXAMPLES"}
                                  </span>
                                </button>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                </div>
              </div>

              {/* Return to Home Button */}
              <div className="border-t border-gray-700 p-3">
                <Link href="/" className="block w-full">
                  <motion.button
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    whileHover={{ backgroundColor: "rgba(31, 41, 55, 0.8)" }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <HomeIcon className="w-4 h-4 flex-shrink-0" />
                    <span>Return to Home</span>
                  </motion.button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Column - Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col p-6">
          {selectedGlobalPrompt ? (
            // Global Prompt Selected
            <div className="flex flex-col h-full">
              {/* Header Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <selectedGlobalPrompt.icon className="w-12 h-12 text-blue-400" />
                    <div>
                      <h1 className="text-2xl font-bold text-white">
                        {selectedGlobalPrompt.name}
                      </h1>
                      <p className="text-sm text-gray-400">
                        Global prompt configuration for{" "}
                        {selectedGlobalPrompt.name.toLowerCase()}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div>
                    {!isEditing ? (
                      <motion.button
                        onClick={handleEdit}
                        disabled={isLoadingGlobalPrompt}
                        className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${
                          isLoadingGlobalPrompt ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                        whileHover={!isLoadingGlobalPrompt ? { scale: 1.02 } : {}}
                        whileTap={!isLoadingGlobalPrompt ? { scale: 0.98 } : {}}
                      >
                        <PencilIcon className="w-4 h-4" />
                        <span>Edit</span>
                      </motion.button>
                    ) : (
                      <div className="flex space-x-2">
                        <motion.button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
                          whileHover={!isSaving ? { scale: 1.02 } : {}}
                          whileTap={!isSaving ? { scale: 0.98 } : {}}
                        >
                          <CheckIcon className="w-4 h-4" />
                          <span>{isSaving ? "Saving..." : "Save"}</span>
                        </motion.button>
                        <motion.button
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors"
                          whileHover={!isSaving ? { scale: 1.02 } : {}}
                          whileTap={!isSaving ? { scale: 0.98 } : {}}
                        >
                          <XMarkIcon className="w-4 h-4" />
                          <span>Cancel</span>
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>

                {saveError && (
                  <div className="text-red-400 text-sm mt-2">{saveError}</div>
                )}

                {saveSuccess && (
                  <div className="text-blue-400 text-sm mt-2">
                    {saveSuccess}
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden">
                {isLoadingGlobalPrompt ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">Loading prompt content...</p>
                  </div>
                ) : isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full p-6 bg-gray-800 text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm leading-relaxed"
                    placeholder={`Enter your ${selectedGlobalPrompt.name.toLowerCase()} prompt here...`}
                    autoFocus
                  />
                ) : (
                  <div className="h-full overflow-y-auto">
                    {globalPromptContent ? (
                      <pre className="p-6 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed font-mono">
                        {globalPromptContent}
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <p className="text-gray-400">
                            No prompt content available for this global prompt
                            type.
                          </p>
                          <p className="text-gray-500 text-sm mt-2">
                            Click "Edit" to add content.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : isStoreContentSelected ? (
            // Store-specific content selected
            <div className="flex flex-col h-full">
              {/* Header Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <StoreContentIcon className="w-12 h-12 text-blue-500" />
                    <div>
                      <h1 className="text-2xl font-bold text-white">
                        {storeContentTitle}
                      </h1>
                      <p className="text-sm text-gray-400">
                        {storeContentSubtitle}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div>
                    {!isEditing ? (
                      <motion.button
                        onClick={handleEdit}
                        disabled={isLoadingStoreContent}
                        className={`flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${
                          isLoadingStoreContent ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                        whileHover={!isLoadingStoreContent ? { scale: 1.02 } : {}}
                        whileTap={!isLoadingStoreContent ? { scale: 0.98 } : {}}
                      >
                        <PencilIcon className="w-4 h-4" />
                        <span>Edit</span>
                      </motion.button>
                    ) : (
                      <div className="flex space-x-2">
                        <motion.button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
                          whileHover={!isSaving ? { scale: 1.02 } : {}}
                          whileTap={!isSaving ? { scale: 0.98 } : {}}
                        >
                          <CheckIcon className="w-4 h-4" />
                          <span>{isSaving ? "Saving..." : "Save"}</span>
                        </motion.button>
                        <motion.button
                          onClick={handleCancel}
                          disabled={isSaving}
                          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors"
                          whileHover={!isSaving ? { scale: 1.02 } : {}}
                          whileTap={!isSaving ? { scale: 0.98 } : {}}
                        >
                          <XMarkIcon className="w-4 h-4" />
                          <span>Cancel</span>
                        </motion.button>
                      </div>
                    )}
                  </div>
                </div>

                {storeContentError && (
                  <div className="text-red-400 text-sm mt-2">
                    {storeContentError}
                  </div>
                )}

                {saveError && (
                  <div className="text-red-400 text-sm mt-2">{saveError}</div>
                )}

                {saveSuccess && (
                  <div className="text-blue-200 text-xs font-semibold mt-4">
                    {saveSuccess}
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-1 bg-gray-800 rounded-lg overflow-hidden">
                {isLoadingStoreContent ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">
                      {selectedStoreContentType === "cartridge"
                        ? "Loading cartridge..."
                        : "Loading email examples..."}
                    </p>
                  </div>
                ) : isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full p-6 bg-gray-800 text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm leading-relaxed"
                    placeholder={storeContentPlaceholder}
                    autoFocus
                  />
                ) : (
                  <div className="h-full overflow-y-auto">
                    {storeContent ? (
                      <pre className="p-6 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed font-mono">
                        {storeContent}
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <p className="text-gray-400">
                            {emptyStoreContentMessage}
                          </p>
                          <p className="text-gray-500 text-sm mt-2">
                            Click "Edit" to add content.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Default Landing
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <CogIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h1 className="text-3xl font-bold text-white mb-2">
                  Prompt Warehouse
                </h1>
                <p className="text-lg text-gray-400 mb-6">
                  Manage and customize RIO's prompts
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
