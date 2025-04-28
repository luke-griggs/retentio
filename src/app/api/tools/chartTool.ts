import { z } from "zod";
import { tool } from "ai";



export const chartTool = tool({
  description: "Generate a Vega-Lite v5 JSON spec that visualizes the SQL results. The UI will render the chart.",
  parameters: z.object({
    spec: z.any().describe("The Vega-Lite v5 JSON spec to render"),
  }),
  execute: async ({ spec }) => {
    console.log("model's spec", spec);
    // Defensive size check (≤ 2 kB keeps latency down)
    // if (JSON.stringify(spec).length > 2048) {
    //   throw new Error("Chart spec too large (limit ~ 2 kB)");
    // }
    return { spec };
  }
});
