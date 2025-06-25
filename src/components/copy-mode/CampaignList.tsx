"use client";

import { useState, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface Campaign {
  id: string;
  name: string;
  description: string;
  updated_at: string;
}

interface CampaignListProps {
  storeId: string;
  selectedCampaign: Campaign | null;
  onCampaignSelect: (campaign: Campaign) => void;
}

export default function CampaignList({
  storeId,
  selectedCampaign,
  onCampaignSelect,
}: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (storeId) {
      fetchCampaigns();
    }
  }, [storeId]);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/clickup-tasks/${storeId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch campaigns");
      }

      const data = await response.json();
      setCampaigns(data.tasks || []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError("Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPreviewText = (description: string) => {
    // Extract first 100 characters of plain text
    const plainText = description
      .replace(/#{1,6}\s/g, "") // Remove markdown headers
      .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1") // Remove bold/italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links
      .replace(/\n/g, " ") // Replace newlines with spaces
      .trim();

    return plainText.length > 100
      ? plainText.substring(0, 100) + "..."
      : plainText;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-600"
          />
        </div>
      </div>

      {/* Campaigns List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4">
            <p className="text-gray-400 text-sm">Loading campaigns...</p>
          </div>
        ) : error ? (
          <div className="p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-4">
            <p className="text-gray-400 text-sm">
              {searchQuery
                ? "No campaigns found matching your search"
                : "No campaigns available"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredCampaigns.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => onCampaignSelect(campaign)}
                className={`w-full p-4 text-left hover:bg-gray-800 transition-colors ${
                  selectedCampaign?.id === campaign.id
                    ? "bg-gray-800 border-l-4 border-blue-500"
                    : ""
                }`}
              >
                <h3 className="font-medium text-white mb-1">{campaign.name}</h3>
                <p className="text-sm text-gray-400 line-clamp-2">
                  {getPreviewText(campaign.description || "No content")}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Updated: {new Date(campaign.updated_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
