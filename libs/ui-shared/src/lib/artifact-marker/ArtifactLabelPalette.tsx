"use client";

// Binds window keydown listeners, so it can only ever run on the client. The
// directive is load-bearing rather than decorative: this component is exported
// from the ui-shared barrel, and `apps/ally-web` is a Next.js App Router app
// whose server components import that barrel — without it, every page there
// fails to render.

import { FC, useEffect } from "react";

import { ArtifactLabel } from "./ArtifactMarker";
import { ARTIFACT_SWATCHES } from "./artifactSwatches";

export interface ArtifactLabelPaletteProps {
  labels: ArtifactLabel[];
  armedLabelId: string | null;
  onArm: (labelId: string | null) => void;
  /** Bind number keys 1-9 to arming a label. Desktop only affordance. */
  enableNumberKeys?: boolean;
  disabled?: boolean;
  title?: string;
}

/**
 * The label picker that arms a highlighter. Arming a label then tapping three
 * lines is three taps; select-a-line-then-choose-a-label would be six, which is
 * why the highlighter metaphor won over the inspector one.
 *
 * Clicking the armed label again disarms it, so there is always a way back to
 * reading the artifact without marking it.
 */
export const ArtifactLabelPalette: FC<ArtifactLabelPaletteProps> = ({
  labels,
  armedLabelId,
  onArm,
  enableNumberKeys = true,
  disabled = false,
  title = "Labels",
}) => {
  useEffect(() => {
    if (!enableNumberKeys || disabled) return undefined;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Escape") {
        onArm(null);
        return;
      }
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < labels.length) {
        const labelId = labels[index].id;
        onArm(armedLabelId === labelId ? null : labelId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [labels, armedLabelId, onArm, enableNumberKeys, disabled]);

  return (
    <div className="rounded-md border border-border-light p-3">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-typography-500">
        {title}
      </p>
      <div className="flex flex-col gap-1.5">
        {labels.map((label, index) => {
          const tokens = ARTIFACT_SWATCHES[label.color];
          const armed = armedLabelId === label.id;
          return (
            <button
              key={label.id}
              type="button"
              disabled={disabled}
              aria-pressed={armed}
              title={label.description}
              onClick={() => onArm(armed ? null : label.id)}
              className="flex w-full min-h-[44px] items-center gap-2 rounded-md border px-2.5 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50"
              style={{
                borderColor: armed ? tokens.border : "transparent",
                background: armed ? tokens.tint : "transparent",
                color: armed ? tokens.text : undefined,
                boxShadow: armed ? `inset 0 0 0 1px ${tokens.border}` : undefined,
              }}
            >
              <span className="h-3 w-3 flex-none rounded-sm" style={{ background: tokens.solid }} />
              <span className="flex-1 font-medium">{label.text}</span>
              {enableNumberKeys && index < 9 && (
                <span className="flex-none rounded border border-border-light px-1 font-mono text-[10px] text-typography-500">
                  {index + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
