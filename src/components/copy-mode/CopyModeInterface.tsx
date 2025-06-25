"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HomeIcon,
  FolderIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import EmailEditor from "./EmailEditor";
import EmailEditChat from "./EmailEditChat";

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
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  );
  const [emailContent, setEmailContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch stores
  useEffect(() => {
    fetchStores();
  }, []);

  // Fetch campaigns when store is selected
  useEffect(() => {
    if (selectedStore) {
      fetchCampaigns(selectedStore.id);
    } else {
      setCampaigns([]);
    }
  }, [selectedStore]);

  const fetchStores = async () => {
    try {
      setIsLoadingStores(true);
      setStoreError(null);

      const response = await fetch("/api/stores");
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

  const fetchCampaigns = async (storeId: string) => {
    try {
      setIsLoadingCampaigns(true);
      setCampaignError(null);

      const response = await fetch(`/api/clickup-tasks/${storeId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }

      const data = await response.json();
      setCampaigns(data.tasks || []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setCampaignError("Failed to load campaigns");
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  // Update email content when campaign is selected
  useEffect(() => {
    if (selectedCampaign) {
      const description = selectedCampaign.description?.trim();
      if (description && description.length > 0) {
        setEmailContent(description);
      } else {
        // Set a clear empty state for campaigns without content
        setEmailContent("");
      }
    } else {
      setEmailContent("");
    }
  }, [selectedCampaign]);

  const handleSave = async () => {
    if (!selectedCampaign) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/clickup-tasks/task/${selectedCampaign.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: emailContent,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save changes");
      }

      const data = await response.json();
      console.log("Saved successfully:", data);

      // Update the selected campaign with new data
      if (data.task) {
        setSelectedCampaign(data.task);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      // TODO: Show error toast/notification
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStoreClick = (store: Store) => {
    if (selectedStore?.id === store.id) {
      // Clicking on already selected store collapses it
      setSelectedStore(null);
      setSelectedCampaign(null);
    } else {
      // Select new store
      setSelectedStore(store);
      setSelectedCampaign(null);
    }
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
                      {isLoadingCampaigns ? (
                        <div className="py-2 text-gray-400 text-xs">
                          Loading campaigns...
                        </div>
                      ) : campaignError ? (
                        <div className="py-2 text-red-400 text-xs">
                          {campaignError}
                        </div>
                      ) : filteredCampaigns.length === 0 ? (
                        <div className="py-2 text-gray-400 text-xs">
                          {searchQuery
                            ? "No campaigns found"
                            : "No campaigns available"}
                        </div>
                      ) : (
                        filteredCampaigns.map((campaign) => (
                          <button
                            key={campaign.id}
                            onClick={() => setSelectedCampaign(campaign)}
                            className={`w-full flex items-center space-x-2 px-2 py-1.5 text-xs text-left transition-colors hover:bg-gray-800 ${
                              selectedCampaign?.id === campaign.id
                                ? "bg-gray-800 text-white"
                                : "text-gray-400"
                            }`}
                          >
                            <DocumentTextIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{campaign.name}</span>
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

      {/* Middle Column - AI Chat */}
      {selectedCampaign && (
        <div className="w-96 border-r border-gray-700">
          <EmailEditChat
            campaign={selectedCampaign}
            emailContent={emailContent}
            onContentChange={setEmailContent}
          />
        </div>
      )}

      {/* Right Column - Email Editor or Store Overview */}
      <div className="flex-1 flex flex-col">
        {selectedCampaign ? (
          <>
            <div className="p-4 flex justify-center">
              <div className="pt-8 flex flex-col items-center">
                <h1 className="text-3xl font-semibold text-white pb-1">
                  {selectedCampaign.name}
                </h1>
                <p className="text-xs text-gray-400">
                  Last updated:{" "}
                  {new Date(selectedCampaign.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <EmailEditor content={emailContent} onChange={setEmailContent} />
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
                  {filteredCampaigns.length} campaign
                  {filteredCampaigns.length !== 1 ? "s" : ""} available
                </p>

                {/* Campaigns List */}
                {isLoadingCampaigns ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-gray-400">Loading campaigns...</p>
                  </div>
                ) : campaignError ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-red-400">{campaignError}</p>
                  </div>
                ) : filteredCampaigns.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-gray-400">No campaigns available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCampaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        onClick={() => setSelectedCampaign(campaign)}
                        className="w-full px-6 py-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200 text-left group cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium text-lg mb-1 truncate">
                              {campaign.name}
                            </h3>
                            <p className="text-gray-400 text-sm">
                              Last updated:{" "}
                              {new Date(
                                campaign.updated_at
                              ).toLocaleDateString()}{" "}
                              at{" "}
                              {new Date(campaign.updated_at).toLocaleTimeString(
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
  );
}
