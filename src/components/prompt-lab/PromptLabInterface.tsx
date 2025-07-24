"use client";

import { useState } from "react";
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
import { RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface EmailContent {
  subjectLines: string[];
  previewText: string;
  header: string;
  body: string;
  cta: string;
}

export function PromptLabInterface() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [emailPrompt, setEmailPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [generatedEmail, setGeneratedEmail] = useState<EmailContent | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateEmail = async () => {
    if (!systemPrompt.trim() || !emailPrompt.trim()) {
      toast.error("Please enter both system prompt and email prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/prompt-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, emailPrompt, model: selectedModel }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate email");
      }

      const data = await response.json();
      setGeneratedEmail(data.email);
    } catch (error) {
      toast.error("Failed to generate email. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex gap-6 h-full">
      {/* Left side - Prompt Input */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        <Card className="bg-gray-800 border-gray-700 rounded-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">System Prompt</CardTitle>
            <CardDescription className="text-gray-400">
              Enter your complete system prompt below. The formatting
              instructions will be automatically appended.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Enter your system prompt here..."
              className="h-[350px] bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 rounded-lg resize-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors"
            />
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700 rounded-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Email Prompt</CardTitle>
            <CardDescription className="text-gray-400">
              Enter the specific email prompt or context for this generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={emailPrompt}
              onChange={(e) => setEmailPrompt(e.target.value)}
              placeholder="Enter your email prompt here..."
              className="min-h-[120px] bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 rounded-lg resize-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors"
            />
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Model
              </label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-white hover:bg-gray-800 focus:ring-1 focus:ring-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700">
                  <SelectItem value="gpt-4o" className="text-white hover:bg-gray-800">
                    GPT-4o
                  </SelectItem>
                  <SelectItem value="claude-4-sonnet" className="text-white hover:bg-gray-800">
                    Claude 4 Sonnet
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleGenerateEmail}
                disabled={
                  isGenerating || !systemPrompt.trim() || !emailPrompt.trim()
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
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Sparkles className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">
                    Enter both prompts and click "Generate Email" to see the
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
