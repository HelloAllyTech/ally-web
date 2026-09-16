import React from "react";

import { InlineLoading } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { BuilderTodoItem } from "@types";

import { builderTransition, prefersReducedMotion } from "../../pages/Builder/builderMotion";

interface TodoPanelProps {
  items: BuilderTodoItem[];
  /**
   * Whether the run is still going.
   *
   * The list is agent-asserted: the agent posts it once from the plan and is
   * asked to re-send it as work completes. It frequently does not — the first
   * real build finished with two pull requests open and this panel still
   * reading "0 of 7" with a spinner on item one.
   *
   * So a finished run must stop animating and stop implying anything is in
   * flight. What it must NOT do is mark the items done: nobody told us they
   * were, and inventing progress is worse than admitting we lost track.
   */
  isLive?: boolean;
}

/**
 * The agent's own checklist, as it last sent it.
 *
 * The agent replaces the whole list on every change rather than sending
 * deltas, so this renders the newest snapshot and nothing else — no merging,
 * no reconciliation, and no way for the panel to disagree with what the agent
 * thinks it is doing.
 *
 * This is the single most useful thing on the build screen: a transcript tells
 * you what just happened, and this tells you how much is left.
 */
export const TodoPanel: React.FC<TodoPanelProps> = ({ items, isLive = true }) => {
  const strings = en.builder.build;
  if (!items.length) return null;

  const done = items.filter(item => item.status === "done").length;
  // A run that ended without completing its list did not stall — it stopped
  // telling us. Saying so beats a spinner that never resolves.
  const abandoned = !isLive && done < items.length;

  return (
    <section className="border-b border-neutral-200 px-4 py-3">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-typography-500">
          {strings.todoHeading}
        </h2>
        <span className="text-xs text-typography-500">
          {abandoned
            ? strings.todoStopped(done, items.length)
            : strings.todoProgress(done, items.length)}
        </span>
      </header>

      <ul className="flex flex-col gap-1">
        {items.map((item, index) => {
          const isDone = item.status === "done";
          // Never "in progress" once the run has ended.
          const inProgress = isLive && item.status === "in_progress";

          return (
            <li
              key={item.id ?? `${index}-${item.text}`}
              className="flex items-start gap-2 text-sm"
              style={
                prefersReducedMotion()
                  ? undefined
                  : { transition: builderTransition(["opacity", "color"], "fast") }
              }
            >
              <span className="mt-0.5 shrink-0">
                {inProgress ? (
                  <InlineLoading description="" />
                ) : (
                  <span
                    className={[
                      "inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px]",
                      isDone
                        ? "border-support-success bg-support-success text-white"
                        : "border-neutral-300 text-transparent",
                    ].join(" ")}
                    aria-hidden
                  >
                    ✓
                  </span>
                )}
              </span>
              <span
                className={[
                  "min-w-0 flex-1",
                  isDone
                    ? "text-typography-400 line-through"
                    : inProgress
                      ? "font-medium text-typography-900"
                      : "text-typography-700",
                ].join(" ")}
              >
                {item.text}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
