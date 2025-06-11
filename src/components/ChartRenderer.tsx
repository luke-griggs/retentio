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

// We export the plain function component to satisfy the stricter JSXElementConstructor
// type constraints introduced with the React 19 typings. A separate memoized version
// is still provided for consumers that want to optimise re-renders without hitting the
// new typing limitation that excludes `MemoExoticComponent` from valid JSX element
// types.

export const ChartRenderer: React.FC<{ spec: VisualizationSpec }> = ({
  spec,
}) => {
  if (!VegaLite) {
    return <p className="text-sm">Loading chart...</p>;
  }

  console.log("%c⤵️ rendering Vega-Lite spec", "color:#8b5cf6;", spec);

  return (
    <div className="my-4">
      <VegaLite spec={spec as any} actions={false} />
    </div>
  );
};

// Optional memoised export if some areas of the codebase want to take advantage
// of memoisation explicitly. Having this separate keeps the default export type
// simple and compatible with React 19's JSX constraints.
export const MemoizedChartRenderer = React.memo(ChartRenderer);
