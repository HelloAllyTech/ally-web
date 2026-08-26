import React from "react";

import { InlineLoading } from "@ally-ui-mono/ui-shared";
import { en } from "@constants";
import { BuilderTodoItem } from "@types";

import { builderTransition, prefersReducedMotion } from "../../pages/Builder/builderMotion";

interface TodoPanelProps {
  items: BuilderTodoItem[];
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
export const TodoPanel: React.FC<TodoPanelProps> = ({ items }) => {
  const strings = en.builder.build;
  if (!items.length) return null;

  const done = items.filter(item => item.status === "done").length;

  return (
    <section className="border-b border-neutral-200 px-4 py-3">
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-typography-500">
          {strings.todoHeading}
        </h2>
        <span className="text-xs text-typography-500">
          {strings.todoProgress(done, items.length)}
        </span>
      </header>

      <ul className="flex flex-col gap-1">
        {items.map((item, index) => {
          const isDone = item.status === "done";
          const inProgress = item.status === "in_progress";

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
