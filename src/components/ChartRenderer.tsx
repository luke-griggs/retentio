// app/components/ChartRenderer.tsx
"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { VisualizationSpec } from "vega-embed";

/* ------------------ 1) load react-vega only on the client ------------------ */
const VegaLite = dynamic(
  () => import("react-vega").then((mod) => mod.VegaLite ?? mod.default),
  { ssr: false, loading: () => <p className="text-sm">Loading chart…</p> }
);

/* ------------------ 2) main component ------------------ */
export const ChartRenderer = React.memo(function ChartRenderer({
  spec,
}: {
  spec: VisualizationSpec;
}) {
  if (!VegaLite) {
    return <p className="text-sm">Loading chart...</p>;
  }

  console.log("%c⤵️ rendering Vega-Lite spec", "color:#8b5cf6;", spec);

  return (
    <div className="my-4">
      <VegaLite spec={spec as any} actions={false} />
    </div>
  );
});
