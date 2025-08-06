"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Sparkles, ThumbsUp, ThumbsDown, X } from "lucide-react";
import { toast } from "sonner";
import { NextResponse } from "next/server";

interface EmailContent {
  subjectLines: string[];
  previewText: string;
  header: string;
  body: string;
  cta: string;
}

const loadingMessages = [
  "Analyzing your template for maximum retention power...",
  "Senior copywriter is reviewing the campaign strategy...",
  "Counting characters like they're precious gems (40-60 for headers)...",
  "Teaching Claude to think deeply about your content...",
  "Ensuring no colons or dashes sneak into the subject line...",
  "Limiting body copy to exactly 200-240 characters (not a character more!)...",
  "Strategically placing **_emphasis_** for maximum impact...",
  "Making sure we're not starting with 'Transform' or 'Discover'...",
  "Crafting a CTA that's 15-20 characters of pure clickability...",
  "Double-checking the preview text isn't spoiling the surprise...",
  "Formatting everything into that perfect markdown table...",
  "Ensuring brand-agnostic copy (no names unless you asked)...",
  "Polishing subject lines to 30-45 characters of perfection...",
  "Our best copywriter kid is slinging those subject lines..."
];

export function PromptLabInterface() {
  const [emailPrompt, setEmailPrompt] = useState("");
  const [generatedEmail, setGeneratedEmail] = useState<EmailContent | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentLoadingMessage, setCurrentLoadingMessage] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showNegativeFeedback, setShowNegativeFeedback] = useState(false);
  const [negativeReasons, setNegativeReasons] = useState<string[]>([]);
  const [customFeedback, setCustomFeedback] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [isGenerating]);

  useEffect(() => {
    setCurrentLoadingMessage(loadingMessages[messageIndex]);
  }, [messageIndex]);

  const handleGenerateEmail = async () => {
    if (!emailPrompt.trim()) {
      toast.error("Please enter an email prompt");
      return;
    }

    setIsGenerating(true);
    setGeneratedEmail(null);
    setMessageIndex(0);
    setCurrentLoadingMessage(loadingMessages[0]);
    try {
      const response = await fetch("/api/prompt-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: "default", emailPrompt }),
      });


      if (!response.ok) {
        throw new Error("Failed to generate email");
      }
      const data = await response.json();
      console.log("OUTLINE:", data.outline);
      console.log("EMAIL:", data.email);
      setGeneratedEmail(data.parsedEmail);
      setFeedbackSubmitted(false);
      setShowNegativeFeedback(false);
      setNegativeReasons([]);
      setCustomFeedback("");
    } catch (error) {
      toast.error("Failed to generate email. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFeedback = async (type: "positive" | "negative") => {
    if (type === "positive") {
      setIsSubmittingFeedback(true);
      try {
        await fetch("/api/prompt-lab/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailPrompt,
            generatedEmail,
            feedbackType: "positive",
          }),
        });
        setFeedbackSubmitted(true);
        toast.success("Thanks for making RIO better!");
      } catch (error) {
        toast.error("Failed to submit feedback. Please try again.");
      } finally {
        setIsSubmittingFeedback(false);
      }
    } else {
      setShowNegativeFeedback(true);
    }
  };

  const submitNegativeFeedback = async () => {
    if (negativeReasons.length === 0 && !customFeedback.trim()) {
      toast.error("Please select a reason or provide custom feedback");
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      await fetch("/api/prompt-lab/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailPrompt,
          generatedEmail,
          feedbackType: "negative",
          negativeReasons,
          customFeedback,
        }),
      });
      setFeedbackSubmitted(true);
      setShowNegativeFeedback(false);
      toast.success("Thank you for your feedback!");
    } catch (error) {
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const toggleReason = (reason: string) => {
    setNegativeReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left side - Prompt Input */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        <Card className="bg-gray-800 border-gray-700 rounded-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Email Upload</CardTitle>
            <CardDescription className="text-gray-400">
              Enter the email template for generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={emailPrompt}
              onChange={(e) => setEmailPrompt(e.target.value)}
              placeholder="Enter your email template here..."
              className="h-[400px] bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 rounded-lg resize-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors"
            />
            
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleGenerateEmail}
                disabled={
                  isGenerating || !emailPrompt.trim()
                }
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 font-medium transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Email
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right side - Email Preview */}
      <div className="flex-1">
        <Card className="h-full bg-gray-800 border-gray-700 rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-white text-lg">
                Generated Email
              </CardTitle>
              <CardDescription className="text-gray-400">
                Preview of the email generated using your prompt
              </CardDescription>
            </div>
            {generatedEmail && (
              <Button
                onClick={handleGenerateEmail}
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            )}
          </CardHeader>
          <CardContent className="overflow-auto h-[calc(100%-120px)]">
            {generatedEmail ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    Subject Lines
                  </h3>
                  {generatedEmail.subjectLines.map((subject, index) => (
                    <div
                      key={index}
                      className="p-4 bg-gray-900 rounded-lg border border-gray-700"
                    >
                      <p className="text-white">{subject}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    Preview Text
                  </h3>
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <p className="text-white">{generatedEmail.previewText}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    Header
                  </h3>
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <p className="text-white">{generatedEmail.header}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    Body
                  </h3>
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <p className="text-white whitespace-pre-wrap">
                      {generatedEmail.body}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                    CTA
                  </h3>
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <p className="text-white">{generatedEmail.cta}</p>
                  </div>
                </div>

                {!feedbackSubmitted && (
                  <div className="mt-8 pt-6 border-t border-gray-700">
                    <div className="space-y-4">
                      <p className="text-gray-400 text-center text-sm">
                        Help Luke improve Rio
                      </p>
                      <div className="flex justify-center gap-4">
                        <Button
                          onClick={() => handleFeedback("positive")}
                          disabled={isSubmittingFeedback}
                          variant="outline"
                          size="sm"
                          className="border-green-600 bg-transparent text-green-500 hover:bg-green-600/10 hover:text-green-400 rounded-lg transition-colors"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleFeedback("negative")}
                          disabled={isSubmittingFeedback}
                          variant="outline"
                          size="sm"
                          className="border-red-600 bg-transparent text-red-500 hover:bg-red-600/10 hover:text-red-400 rounded-lg transition-colors"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {showNegativeFeedback && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white text-lg font-medium">
                          What went wrong?
                        </h3>
                        <Button
                          onClick={() => setShowNegativeFeedback(false)}
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        {[
                          { id: "formatting", label: "Didn't adhere to formatting" },
                          { id: "generic", label: "Generic copy" },
                          { id: "deviated", label: "Deviated from content strategy" },
                        ].map((option) => (
                          <label
                            key={option.id}
                            className="flex items-center space-x-3 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={negativeReasons.includes(option.id)}
                              onChange={() => toggleReason(option.id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-300">{option.label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm text-gray-400 mb-2">
                          Additional feedback (optional)
                        </label>
                        <Textarea
                          value={customFeedback}
                          onChange={(e) => setCustomFeedback(e.target.value)}
                          placeholder="Tell me more about what could be improved..."
                          className="h-24 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 rounded-lg resize-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => setShowNegativeFeedback(false)}
                          variant="outline"
                          className="flex-1 border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={submitNegativeFeedback}
                          disabled={isSubmittingFeedback}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : isGenerating ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-6">
                  <div className="relative">
                    <RefreshCw className="h-16 w-16 text-blue-500 mx-auto animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 bg-blue-500 rounded-full animate-ping opacity-20" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-white text-lg font-medium">Crafting your email...</p>
                    <p className="text-gray-400 text-sm max-w-sm mx-auto animate-pulse transition-all duration-500">
                      {currentLoadingMessage}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    Enter your email template and click "Generate Email" to see the
                    result
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
