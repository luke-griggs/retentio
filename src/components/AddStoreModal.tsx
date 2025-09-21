"use client";

import { useState } from "react";

type AddStoreForm = {
  name: string;
  clickup_list_id: string;
  brand_type: string;
  brand_tone: string;
};

type StoreRecord = {
  id: string;
  name: string;
  clickup_list_id: string;
  brand_type: string | null;
  brand_tone: string | null;
};

interface AddStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (store: StoreRecord) => void;
}

const InputField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  name: keyof AddStoreForm;
  value: string;
  onChange: (name: keyof AddStoreForm, value: string) => void;
  placeholder?: string;
  required?: boolean;
}) => {
  const id = `store-${name}`;

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
        type="text"
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-yellow-400 focus:outline-none transition-colors"
      />
    </div>
  );
};

export function AddStoreModal({
  isOpen,
  onClose,
  onSuccess,
}: AddStoreModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<AddStoreForm>({
    name: "",
    clickup_list_id: "",
    brand_type: "",
    brand_tone: "",
  });

  const handleFieldChange = (name: keyof AddStoreForm, value: string) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      clickup_list_id: "",
      brand_type: "",
      brand_tone: "",
    });
    setErrorMessage(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.clickup_list_id.trim() ||
      !formData.brand_type.trim() ||
      !formData.brand_tone.trim()
    ) {
      setErrorMessage(
        "Please provide a store name, ClickUp list ID, brand type, and brand tone."
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/clickup/fetch-stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          clickup_list_id: formData.clickup_list_id,
          brand_type: formData.brand_type || null,
          brand_tone: formData.brand_tone || null,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          (payload && (payload.error || payload.details)) ||
          "Failed to create store. Please try again.";
        setErrorMessage(message);
        return;
      }

      const createdStore = payload?.store as StoreRecord | undefined;

      if (createdStore) {
        onSuccess?.(createdStore);
      }

      resetForm();
      onClose();
    } catch (error) {
      console.error("Error creating store:", error);
      setErrorMessage("Unexpected error creating store. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl w-full max-w-xl my-8 border border-slate-700">
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h3 className="text-xl font-semibold text-white">Add Store</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isSubmitting}
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
          {errorMessage && (
            <div className="p-3 bg-red-900/40 border border-red-700 text-red-200 text-sm rounded-lg">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Store Name"
              name="name"
              value={formData.name}
              onChange={handleFieldChange}
              placeholder="e.g., Legendary Foods"
              required
            />
            <InputField
              label="ClickUp List ID"
              name="clickup_list_id"
              value={formData.clickup_list_id}
              onChange={handleFieldChange}
              placeholder="e.g., 1234567890"
              required
            />
          </div>

          <InputField
            label="Brand Type"
            name="brand_type"
            value={formData.brand_type}
            onChange={handleFieldChange}
            placeholder="BBQ Accessories"
            required
          />

          <InputField
            label="Brand Tone"
            name="brand_tone"
            value={formData.brand_tone}
            onChange={handleFieldChange}
            placeholder="e.g., Bold yet friendly"
            required
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSubmitting ? "Adding..." : "Add Store"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
