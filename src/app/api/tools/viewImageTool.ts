import { tool } from "ai";
import { z } from "zod";

export const viewImageTool = tool({
  description:
    "displays the image of a campaign to the user. Pass in the url of the image to view",
  parameters: z.object({
    imageUrl: z.string().url().describe("The URL of the image to view"),
    campaignName: z.string().describe("The name of the campaign"),
  }),
  execute: async ({ imageUrl, campaignName }) => {
    try {
      // You can add more robust validation here if needed, e.g., checking if the URL is reachable.
      // For now, we assume if the model provides a URL, it's likely one it expects to work with.
      const res = await fetch(imageUrl);
      if (!res.ok) {
        throw new Error(
          `Failed to fetch image: ${res.status} ${res.statusText} for URL: ${imageUrl}`
        );
      }

      const buf = Buffer.from(await res.arrayBuffer());
      const b64 = buf.toString('base64');

      return { cdnUrl: imageUrl, base64: b64, campaignName: campaignName };
    } catch (error: any) {
      console.error("[viewImageTool] Error executing view_image tool:", error);
      return {
        url: imageUrl, // Still return URL for context
        error: error.message || "Unknown error processing image URL",
        toolExecutionFailed: true, // Custom flag
      };
    }
  },
  experimental_toToolResultContent: (result) => {
    // Type guard to check if result has error property
    if (typeof result === "object" && result !== null && "error" in result) {
      return [{ type: "text", text: `Error: ${(result as any).error}` }];
    }

    // Type guard to check if result has cdnUrl property
    if (typeof result === "object" && result !== null && "cdnUrl" in result) { //TODO: change this to url once we update to v5
      return [ 
        {
          type: "image",
          data: result.base64,
          mimeType: "image/png",
        },
      ];
    }

    // Fallback for unexpected result types
    return [{ type: "text", text: "Unexpected result format" }];
  },
});
