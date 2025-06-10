import React from "react";
import { DatabaseResult } from "./MessageComponents";
const DbTable = ({ results }: { results: DatabaseResult[] }) => {
  return (
    <table className="w-full text-sm border-collapse">
      <thead className="sticky top-0">
        <tr>
          {/* Only try to access keys if results[0] is actually an object */}
          {results[0] && typeof results[0] === "object"
            ? Object.keys(results[0] as Record<string, unknown>).map(
                (column) => (
                  <th
                    key={column}
                    className="p-3 text-left bg-gray-100 dark:bg-gray-900 text-blue-600 dark:text-blue-400 font-medium border-b border-gray-200 dark:border-gray-700"
                  >
                    {column}
                  </th>
                )
              )
            : null}
        </tr>
      </thead>
      <tbody>
        {/* Ensure we're only mapping over array items that are objects */}
        {results
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === "object" && item !== null
          )
          .map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={
                rowIndex % 2 === 0
                  ? "bg-white dark:bg-gray-800"
                  : "bg-gray-50 dark:bg-gray-700"
              }
            >
              {Object.values(row).map((value, valueIndex) => (
                <td
                  key={valueIndex}
                  className="p-3 border-b border-gray-200 dark:border-gray-700/30"
                >
                  {value === null ? (
                    <span className="text-gray-400 italic">null</span>
                  ) : typeof value === "object" ? (
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-900 p-1 rounded">
                      {JSON.stringify(value)}
                    </span>
                  ) : (
                    String(value)
                  )}
                </td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
  );
};

export default DbTable;
