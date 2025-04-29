import { z } from "zod";
import { tool } from "ai";
import { renderChartPrompt } from "@/prompts/renderChartPrompt";



export const chartTool = tool({
  description: renderChartPrompt,
  parameters: z.object({
    spec: z.any().describe("The Vega-Lite v5 JSON spec to render"),
  }),
  execute: async ({ spec }) => {
    // Defensive size check (≤ 2 kB keeps latency down)
    // if (JSON.stringify(spec).length > 2048) {
    //   throw new Error("Chart spec too large (limit ~ 2 kB)");
    // }
    return { spec };
  }
});
