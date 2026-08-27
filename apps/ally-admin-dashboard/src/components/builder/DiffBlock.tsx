import React, { useMemo } from "react";

import { en } from "@constants";

import { computeLineDiff } from "./diffLines";

interface DiffBlockProps {
  oldText: string;
  newText: string;
}

/**
 * A file edit as a proper line-level diff — added and removed lines
 * interleaved in place, the way a code review reads them — rather than the
 * whole "before" text in one red block stacked above the whole "after" text
 * in one green block, which forces the reader to hold both versions in their
 * head to find what actually changed.
 *
 * Scrolls inside its own box (both axes — a long line must not force the
 * page to scroll sideways) and is capped in height so one big edit doesn't
 * push the rest of the transcript off screen.
 */
export const DiffBlock: React.FC<DiffBlockProps> = ({ oldText, newText }) => {
  const strings = en.builder.build;
  const lines = useMemo(() => computeLineDiff(oldText, newText), [oldText, newText]);

  const additions = lines.filter(line => line.type === "add").length;
  const deletions = lines.filter(line => line.type === "remove").length;

  if (lines.length === 0 || (additions === 0 && deletions === 0)) {
    return <p className="px-2 py-1.5 text-xs italic text-typography-500">{strings.diffNoChange}</p>;
  }

  return (
    <div className="border-t border-neutral-200">
      <div className="flex gap-3 border-b border-neutral-100 bg-neutral-50 px-2 py-1 text-[11px] font-medium">
        {additions > 0 && (
          <span className="text-support-success">{strings.diffAdditions(additions)}</span>
        )}
        {deletions > 0 && (
          <span className="text-support-error">{strings.diffDeletions(deletions)}</span>
        )}
      </div>
      <div className="max-h-72 overflow-auto font-mono text-[11px]">
        {lines.map((line, index) => (
          <div
            key={index}
            className={[
              "whitespace-pre px-2",
              line.type === "add"
                ? "bg-green-50 text-green-900"
                : line.type === "remove"
                  ? "bg-red-50 text-red-900"
                  : "text-typography-600",
            ].join(" ")}
          >
            <span className="mr-2 inline-block w-3 select-none text-typography-400">
              {line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}
            </span>
            {line.text.length ? line.text : " "}
          </div>
        ))}
      </div>
    </div>
  );
};
