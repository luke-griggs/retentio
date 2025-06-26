"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
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
} from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import EmailEditor, { EmailEditorRef } from "./EmailEditor";
import EmailEditChat from "./EmailEditChat";
import { useEmailVersions } from "@/hooks/use-email-versions";
import { toast } from "sonner"; // TODO: set up toast

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
}

export default function CopyModeInterface() {
  const editorRef = useRef<EmailEditorRef>(null);
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

  // Initialize version history - use campaign ID as key to prevent resets on save
  const versionKey = selectedTask?.id || "";
  const initialContent = selectedTask?.description || "";
  const { currentContent, versions, canUndo, canRedo, addVersion, undo, redo } =
    useEmailVersions(initialContent, versionKey);

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
      setStores(data.stores || []);
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
  }, [selectedTask]);

  const handleUpdateCard = async () => {
    if (!selectedTask) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(
        `/api/clickup/update-task/${selectedTask.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `${process.env.CLICKUP_KEY}`,
          },
          body: JSON.stringify({
            description: currentContent,
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
    } catch (error) {
      console.error("Error updating card:", error);
      setSaveError("Failed to update card");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReadyForDesign = async () => {
    if (!selectedTask) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(
        `/api/clickup/update-task/${selectedTask.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `${process.env.CLICKUP_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: currentContent,
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
    } catch (error) {
      console.error("Error marking as ready for design:", error);
      setSaveError("Failed to mark as ready for design");
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
    // Don't add version on every keystroke, this will be handled by the chat
  };

  const handleAIContentChange = (content: string, description?: string) => {
    // Add a new version when AI makes changes
    addVersion(content, "ai", description);
    setEmailContent(content);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Column - Store and Campaign Tree */}
      <div className="w-80 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          {/* Return to Home Button */}
          <div className="flex mb-3">
            <Link href="/">
              <button className="flex items-center space-x-2 px-2 py-1 text-sm text-gray-400 hover:text-white transition-colors">
                <HomeIcon className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </Link>
          </div>

          <h2 className="text-lg font-medium text-gray-300">Stores</h2>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Store Folders */}
          <div className="py-2">
            {isLoadingStores && (
              <div className="px-3 py-2 text-gray-400 text-sm">
                Loading stores...
              </div>
            )}

            {storeError && (
              <div className="px-3 py-2 text-red-400 text-sm">{storeError}</div>
            )}

            {!isLoadingStores && !storeError && stores.length === 0 && (
              <div className="px-3 py-2 text-gray-400 text-sm">
                No stores available
              </div>
            )}

            {!isLoadingStores &&
              !storeError &&
              stores.map((store) => (
                <div key={store.id}>
                  {/* Store Button */}
                  <button
                    onClick={() => handleStoreClick(store)}
                    className={`w-full flex items-center space-x-2 px-3 py-1.5 text-sm text-left transition-colors hover:bg-gray-800 ${
                      selectedStore?.id === store.id
                        ? "bg-gray-800 text-white"
                        : "text-gray-300"
                    }`}
                  >
                    {selectedStore?.id === store.id ? (
                      <ChevronDownIcon className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 flex-shrink-0" />
                    )}
                    <FolderIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{store.name}</span>
                  </button>

                  {/* Campaigns under selected store */}
                  {selectedStore?.id === store.id && (
                    <div className="ml-6 border-l border-gray-700 pl-3">
                      {/* Search Bar */}
                      <div className="py-2 pr-3">
                        <div className="relative">
                          <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-500" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                        filteredTasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => setSelectedTask(task)}
                            className={`w-full flex items-center space-x-2 px-2 py-1.5 text-xs text-left transition-colors hover:bg-gray-800 ${
                              selectedTask?.id === task.id
                                ? "bg-gray-800 text-white"
                                : "text-gray-400"
                            }`}
                          >
                            <DocumentTextIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{task.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Right Column - Email Editor */}
      <div className="flex-1 flex flex-col">
        {/* Version History Bar */}
        {selectedTask && versions.length > 1 && (
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 flex items-center space-x-4">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Undo</span>
            </button>

            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>
                Version{" "}
                {versions.findIndex((v) => v.content === currentContent) + 1} of{" "}
                {versions.length}
              </span>
            </div>

            {canRedo && (
              <button
                onClick={redo}
                className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span>Redo</span>
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center space-x-3 ml-auto">
              <button
                onClick={handleReadyForDesign}
                disabled={isSaving}
                className="flex items-center space-x-2 px-3 py-1 text-sm bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <PaintBrushIcon className="w-4 h-4" />
                <span>Ready for Design</span>
              </button>
              <button
                onClick={handleUpdateCard}
                disabled={isSaving}
                className="flex items-center space-x-2 px-3 py-1 text-sm bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
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
                  isSidePanelOpen ? "w-96" : "w-0"
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
              <EmailEditor
                ref={editorRef}
                content={currentContent}
                onChange={handleContentChange}
              />
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
                <p className="text-lg">Select a store to view campaigns</p>
                <p className="text-sm text-gray-600 mt-1">
                  Choose a store from the sidebar to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
