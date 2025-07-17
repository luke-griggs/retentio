"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  HomeIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  PaintBrushIcon,
  Bars3Icon,
  ChevronDoubleLeftIcon,
} from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import DraggableEmailTable, { DraggableEmailTableRef } from "./DraggableEmailTable";
import EmailEditChat from "./EmailEditChat";
import { useEmailVersions } from "@/hooks/use-email-versions";
import { toast } from "sonner"; // TODO: set up toast
import { campaignHtmlToMarkdown } from "@/utils/campaign-html-to-markdown";

interface Store {
  id: string;
  name: string;
  clickup_list_id: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  updated_at: string;
  content_strategy?: string;
  promo?: string;
  notes?: string;
}

export default function CopyModeInterface() {
  const editorRef = useRef<DraggableEmailTableRef>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedStoreName, setSelectedStoreName] = useState<string>("");
  const [tasks, setTasks] = useState<Campaign[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTask, setSelectedTask] = useState<Campaign | null>(null);
  const [emailContent, setEmailContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingStores, setLoadingStores] = useState(true);
  const [emailUpdating, setEmailUpdating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Initialize version history - use campaign ID as key to prevent resets on save
  const versionKey = selectedTask?.id || "";
  const initialContent = selectedTask?.description || "";
  const {
    currentContent,
    versions,
    canUndo,
    canRedo,
    addVersion,
    undo,
    redo,
    currentVersionIndex,
    goToVersion,
  } = useEmailVersions(initialContent, versionKey);

  // Sync current content with email content state
  useEffect(() => {
    if (currentContent !== emailContent) {
      setEmailContent(currentContent);
    }
  }, [currentContent]);

  // Fetch stores
  useEffect(() => {
    fetchStores();
  }, []);

  // Fetch campaigns when store is selected
  useEffect(() => {
    if (selectedStore) {
      fetchTasks(selectedStore.id);
    } else {
      setTasks([]);
    }
  }, [selectedStore]);

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

  const fetchTasks = async (storeId: string) => {
    try {
      setIsLoadingTasks(true);
      setTaskError(null);

      const response = await fetch(`/api/clickup/fetch-tasks/${storeId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }

      const data = await response.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setTaskError("Failed to load campaigns");
    } finally {
      setIsLoadingTasks(false);
    }
  };

  // Update email content when campaign is selected
  useEffect(() => {
    if (selectedTask) {
      const description = selectedTask.description?.trim();
      if (description && description.length > 0) {
        setEmailContent(description);
      } else {
        // Set a clear empty state for campaigns without content
        setEmailContent("");
      }
    } else {
      setEmailContent("");
    }
    setHasUnsavedChanges(false);
  }, [selectedTask]);

  const handleUpdateCard = async () => {
    if (!selectedTask) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      // Convert HTML table back to markdown format
      const markdownContent = campaignHtmlToMarkdown(emailContent);

      const response = await fetch(
        `/api/clickup/update-task/${selectedTask.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${process.env.CLICKUP_KEY}`,
          },
          body: JSON.stringify({
            description: markdownContent,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update card");
      }

      const data = await response.json();
      console.log("Card updated successfully:", data);
      alert("Card updated successfully");
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      addVersion(emailContent, "user", "Saved changes");
    } catch (error) {
      console.error("Error updating card:", error);
      setSaveError("Failed to update card");
      alert("Failed to update card");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReadyForDesign = async () => {
    if (!selectedTask) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      // Convert HTML table back to markdown format
      const markdownContent = campaignHtmlToMarkdown(emailContent);

      const response = await fetch(
        `/api/clickup/update-task/${selectedTask.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `${process.env.CLICKUP_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: markdownContent,
            status: "READY FOR DESIGN",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to mark as ready for design");
      }

      const data = await response.json();
      console.log("Marked as ready for design successfully:", data);
      alert("Marked as ready for design!");
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      addVersion(emailContent, "user", "Marked as ready for design");
    } catch (error) {
      console.error("Error marking as ready for design:", error);
      setSaveError("Failed to mark as ready for design");
      alert("Failed to mark as ready for design");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTasks = tasks.filter((task) =>
    task.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStoreClick = (store: Store) => {
    if (selectedStore?.id === store.id) {
      // Clicking on already selected store collapses it
      setSelectedStore(null);
      setSelectedTask(null);
    } else {
      // Select new store
      setSelectedStore(store);
      setSelectedTask(null);
    }
  };

  const handleContentChange = (content: string) => {
    setEmailContent(content);
    setHasUnsavedChanges(true);
    // Don't add version on every keystroke, this will be handled by the chat
  };

  const handleAIContentChange = (content: string, description?: string) => {
    // Add a new version when AI makes changes
    addVersion(content, "ai", description);
    setEmailContent(content);
    setHasUnsavedChanges(true);
  };

  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
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

      {/* Left Column - Store and Campaign Tree */}
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
                <h2 className="text-lg font-medium text-gray-300">Stores</h2>
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
              {/* Store Folders */}
              <div className="flex-1 py-2">
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

                      {/* Campaigns under selected store */}
                      <AnimatePresence>
                        {selectedStore?.id === store.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="ml-6 border-l border-gray-700 pl-3 overflow-hidden"
                          >
                            {/* Search Bar */}
                            <div className="py-2 pr-3">
                              <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-500" />
                                <input
                                  type="text"
                                  value={searchQuery}
                                  onChange={(e) =>
                                    setSearchQuery(e.target.value)
                                  }
                                  placeholder="Search campaigns..."
                                  className="w-full pl-7 pr-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                                />
                              </div>
                            </div>

                            {/* Campaign List */}
                            {isLoadingTasks ? (
                              <div className="py-2 text-gray-400 text-xs">
                                Loading campaigns...
                              </div>
                            ) : taskError ? (
                              <div className="py-2 text-red-400 text-xs">
                                {taskError}
                              </div>
                            ) : filteredTasks.length === 0 ? (
                              <div className="py-2 text-gray-400 text-xs">
                                {searchQuery
                                  ? "No tasks found"
                                  : "No tasks available"}
                              </div>
                            ) : (
                              filteredTasks.map((task, taskIndex) => (
                                <motion.button
                                  key={task.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: taskIndex * 0.02 }}
                                  onClick={() => setSelectedTask(task)}
                                  className={`w-full flex items-center space-x-2 px-2 py-1.5 text-xs text-left transition-colors hover:bg-gray-800 ${
                                    selectedTask?.id === task.id
                                      ? "bg-gray-800 text-white"
                                      : "text-gray-400"
                                  }`}
                                  whileHover={{
                                    backgroundColor: "rgba(31, 41, 55, 0.8)",
                                  }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <DocumentTextIcon className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{task.name}</span>
                                </motion.button>
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
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

      {/* Right Column - Email Editor */}
      <div className="flex-1 flex flex-col">
        {/* Version History Bar */}
        {selectedTask && (
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {canUndo && (
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span>Undo</span>
                </button>
              )}

              {versions.length > 1 && (
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <span>
                    Version {currentVersionIndex + 1} of {versions.length}
                  </span>
                </div>
              )}

              {/* Make Current button - only show when not on the latest version */}
              {currentVersionIndex < versions.length - 1 && (
                <button
                  onClick={() => {
                    const currentVersionNumber = currentVersionIndex + 1;
                    addVersion(
                      currentContent,
                      "user",
                      `Made version ${currentVersionNumber} current`
                    );
                  }}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-700 hover:bg-blue-600 rounded-lg transition-colors border border-blue-600 text-white"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Make Current</span>
                </button>
              )}

              {canRedo && (
                <button
                  onClick={redo}
                  className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-white"
                >
                  <span>Redo</span>
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleReadyForDesign}
                disabled={isSaving}
                className="flex items-center space-x-2 px-3 py-3 text-sm bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
              >
                <PaintBrushIcon className="w-4 h-4" />
                <span>Ready for Design</span>
              </button>
              <button
                onClick={handleUpdateCard}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex items-center space-x-2 px-3 py-3 text-sm bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-white"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>Update Card</span>
              </button>
            </div>
          </div>
        )}

        {/* Editor and Campaign List */}
        <div className="flex-1 flex overflow-hidden">
          {selectedTask ? (
            <>
              {/* Side Panel for Email Edit Chat */}
              <div
                className={`transition-all duration-300 ${
                  isSidePanelOpen
                    ? isSidebarOpen
                      ? "w-96"
                      : "w-[520px]" // Wider when main sidebar is collapsed (accounting for 80px column)
                    : "w-0"
                } border-r border-gray-800 overflow-hidden`}
              >
                {isSidePanelOpen && selectedTask && (
                  <EmailEditChat
                    task={selectedTask}
                    emailContent={currentContent}
                    onContentChange={handleAIContentChange}
                    editorRef={editorRef}
                  />
                )}
              </div>

              {/* Email Context Information */}
              <div className="flex-1 flex flex-col">
                {(selectedTask?.content_strategy || selectedTask?.promo) && (
                  <div className=" border-b border-gray-700 p-4 space-y-3">
                    {selectedTask.content_strategy && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-300 mb-2">
                          Content Strategy
                        </h4>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          {selectedTask.content_strategy}
                        </p>
                      </div>
                    )}
                    {selectedTask.promo && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-300 mb-2">
                          Promo
                        </h4>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          {selectedTask.promo}
                        </p>
                      </div>
                    )}
                    {selectedTask.notes && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-300 mb-2">
                          Notes
                        </h4>
                        <p className="text-sm text-gray-400 leading-relaxed">
                          {selectedTask.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <DraggableEmailTable
                  ref={editorRef}
                  content={currentContent}
                  onChange={handleContentChange}
                />
              </div>
            </>
          ) : selectedStore ? (
            <>
              {/* Store Overview - Centered Layout */}
              <div className="flex-1 flex flex-col items-center justify-start pt-16 px-6">
                <div className="max-w-2xl w-full">
                  {/* Store Name - Large Centered Title */}
                  <div className="flex items-center justify-center mb-2">
                    <h1 className="text-4xl font-semibold text-white text-center">
                      {selectedStore.name}
                    </h1>
                  </div>

                  {/* Campaign Count */}
                  <p className="text-gray-400 text-center mb-10">
                    {filteredTasks.length} task
                    {filteredTasks.length !== 1 ? "s" : ""} available
                  </p>

                  {/* Campaigns List */}
                  {isLoadingTasks ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-gray-400">Loading campaigns...</p>
                    </div>
                  ) : taskError ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-red-400">{taskError}</p>
                    </div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-gray-400">No campaigns available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="w-full px-6 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200 text-left group cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-white font-medium text-lg mb-1 truncate">
                                {task.name}
                              </h3>
                              <p className="text-gray-400 text-sm">
                                Last updated:{" "}
                                {new Date(task.updated_at).toLocaleDateString()}{" "}
                                at{" "}
                                {new Date(task.updated_at).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </p>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <ChevronRightIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FolderIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-lg">Select a client to view campaigns</p>
                <p className="text-sm text-gray-600 mt-1">
                  Choose a client from the sidebar to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
