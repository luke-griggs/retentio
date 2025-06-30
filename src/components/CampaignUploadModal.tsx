"use client";

import { useState } from "react";
import { Campaign } from "@/app/utils/csvParse";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface CampaignUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper components for consistent form field styling
const FormField = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  options,
}: {
  label: string;
  name: keyof Campaign;
  value: string;
  onChange: (name: keyof Campaign, value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
}) => {
  const id = `campaign-${name}`;

  if (type === "select" && options) {
    return (
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          required={required}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none transition-colors"
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div>
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          required={required}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none transition-colors resize-none"
        />
      </div>
    );
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-300 mb-1"
      >
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none transition-colors"
      />
    </div>
  );
};

export function CampaignUploadModal({
  isOpen,
  onClose,
}: CampaignUploadModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<Campaign>({
    storeName: "",
    date: "",
    campaignName: "",
    campaignType: "",
    promo: "",
    primaryGoal: "",
    emotionalDriver: "",
    contentStrategy: "",
    inclusionSegments: "",
    exclusionSegments: "",
    sendTime: "",
    abTest: "",
    sms: "",
    plainText: "",
    followUp: "",
    notes: "",
    links: "",
    flexibility: "",
  });

  const campaignTypes = [
    "Bundle / Collection Highlight",
    "Community / UGC",
    "Gift Guide",
    "Launch Announcement",
    "Lifestyle / Use-Case Story",
    "Product Comparison / Guide",
    "Value-Product Education",
    "Promotion / Sale",
    "Seasonal",
    "Tips / Recipe / How-To",
  ];

  const primaryGoals = [
    "Awareness",
    "Education",
    "Engagement",
    "Conversion",
    "Retention",
    "UGC/Social Proof",
    "AOV Lift",
  ];

  // TODO: Get this from the database
  const storeNames = [
    "Haverhill",
    "Legendary Foods",
    "Womaness",
    "BioPower Pet",
    "Drip EZ",
    "ThreadBeast",
    "Life Harmony Energies",
    "Frey",
    "Turn",
    "Luke Test",
    "Mett Naturals",
    "Monsterbass",
    "Seatopia",
    "ProCare",
    "Twelve South",
    "EMF Harmony",
  ];

  const handleFieldChange = (name: keyof Campaign, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.storeName) {
      alert("Please select a client for the campaign");
      return;
    }
    if (!formData.date) {
      alert("Please select a date for the campaign");
      return;
    }

    setIsUploading(true);

    try {
      // Create a FormData object to send the campaign data
      const payload = new FormData();

      // Convert the single campaign to CSV format with headers
      const csvContent = createSingleCampaignCSV(formData);
      const file = new File([csvContent], "single-campaign.csv", {
        type: "text/csv",
      });

      payload.append("file", file);

      const response = await fetch(`/api/clickup/task-upload`, {
        method: "POST",
        body: payload,
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Campaign "${formData.campaignName}" uploaded successfully!`);

        // Reset form
        setFormData({
          storeName: "",
          date: "",
          campaignName: "",
          campaignType: "",
          promo: "",
          primaryGoal: "",
          emotionalDriver: "",
          contentStrategy: "",
          inclusionSegments: "",
          exclusionSegments: "",
          sendTime: "",
          abTest: "",
          sms: "",
          plainText: "",
          followUp: "",
          notes: "",
          links: "",
          flexibility: "",
        });

        onClose();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to upload campaign. Please try again.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload campaign. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const createSingleCampaignCSV = (campaign: Campaign): string => {
    // Create CSV in the format expected by the parser
    const storeName = campaign.storeName;
    const date = campaign.date;

    // Build the CSV structure that matches the parser expectations
    const rows = [
      [storeName], // First row: store name
      ["", date], // Date row
      ["Campaign Name", campaign.campaignName],
      ["Campaign Type", campaign.campaignType],
      ["Promo", campaign.promo],
      ["Primary Goal", campaign.primaryGoal],
      ["Emotional Driver", campaign.emotionalDriver],
      ["Content Strategy", campaign.contentStrategy],
      ["Inclusion Segments", campaign.inclusionSegments],
      ["Exclusion Segments", campaign.exclusionSegments],
      ["Send Time", campaign.sendTime],
      ["A/B Test", campaign.abTest],
      ["SMS", campaign.sms],
      ["Plain Text", campaign.plainText],
      ["Follow Up", campaign.followUp],
      ["Notes", campaign.notes],
      ["Links", campaign.links],
      ["Flexibility", campaign.flexibility],
    ];

    return rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl w-full max-w-2xl my-8 border border-slate-700">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h3 className="text-xl font-semibold text-white">
            Upload Single Campaign
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Store Name"
              name="storeName"
              value={formData.storeName}
              onChange={handleFieldChange}
              type="select"
              options={storeNames}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Date
                <span className="text-red-400 ml-1">*</span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-10 px-3 py-2 justify-start text-left font-normal bg-slate-800 border-slate-600 hover:bg-slate-700 hover:border-slate-500",
                      !formData.date && "text-gray-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? formData.date : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 bg-slate-800 border-slate-600"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={
                      formData.date
                        ? new Date(
                            formData.date + " " + new Date().getFullYear()
                          )
                        : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        // Format as "15 March" to match expected format
                        const formatted = format(date, "d MMMM");
                        handleFieldChange("date", formatted);
                      }
                    }}
                    showOutsideDays={true}
                    initialFocus
                    className="bg-slate-800 text-white [&_[data-outside=true]]:text-slate-500 [&_[data-outside=true]]:opacity-50"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <FormField
            label="Campaign Name"
            name="campaignName"
            value={formData.campaignName}
            onChange={handleFieldChange}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Campaign Type"
              name="campaignType"
              value={formData.campaignType}
              onChange={handleFieldChange}
              type="select"
              options={campaignTypes}
              required
            />

            <FormField
              label="Primary Goal"
              name="primaryGoal"
              value={formData.primaryGoal}
              onChange={handleFieldChange}
              type="select"
              options={primaryGoals}
              required
            />
          </div>

          <FormField
            label="Promo"
            name="promo"
            value={formData.promo}
            onChange={handleFieldChange}
            placeholder="e.g., 20% OFF"
          />

          <FormField
            label="Emotional Driver"
            name="emotionalDriver"
            value={formData.emotionalDriver}
            onChange={handleFieldChange}
            placeholder="e.g., FOMO, Excitement"
          />

          <FormField
            label="Content Strategy"
            name="contentStrategy"
            value={formData.contentStrategy}
            onChange={handleFieldChange}
            type="textarea"
            placeholder="Describe the content approach..."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Inclusion Segments"
              name="inclusionSegments"
              value={formData.inclusionSegments}
              onChange={handleFieldChange}
              placeholder="e.g., VIP, Active Customers"
            />

            <FormField
              label="Exclusion Segments"
              name="exclusionSegments"
              value={formData.exclusionSegments}
              onChange={handleFieldChange}
              placeholder="e.g., Recent Purchasers"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Send Time"
              name="sendTime"
              value={formData.sendTime}
              onChange={handleFieldChange}
              placeholder="e.g., 10:00 AM EST"
            />

            <FormField
              label="A/B Test"
              name="abTest"
              value={formData.abTest}
              onChange={handleFieldChange}
              placeholder="e.g., Subject Line Test"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="SMS"
              name="sms"
              value={formData.sms}
              onChange={handleFieldChange}
              placeholder="Yes/No"
            />

            <FormField
              label="Plain Text"
              name="plainText"
              value={formData.plainText}
              onChange={handleFieldChange}
              placeholder="Yes/No"
            />
          </div>

          <FormField
            label="Follow Up"
            name="followUp"
            value={formData.followUp}
            onChange={handleFieldChange}
            placeholder="e.g., Reminder in 24 hours"
          />

          <FormField
            label="Notes"
            name="notes"
            value={formData.notes}
            onChange={handleFieldChange}
            type="textarea"
            placeholder="Additional notes..."
          />

          <FormField
            label="Links"
            name="links"
            value={formData.links}
            onChange={handleFieldChange}
            type="textarea"
            placeholder="Relevant links..."
          />

          <FormField
            label="Flexibility"
            name="flexibility"
            value={formData.flexibility}
            onChange={handleFieldChange}
            type="select"
            options={["Fluid", "Fixed"]}
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isUploading ? "Uploading..." : "Upload Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
