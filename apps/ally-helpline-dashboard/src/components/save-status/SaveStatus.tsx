import { FC } from "react";

import { useTranslation } from "react-i18next";

import type { SaveState } from "@hooks";

interface SaveStatusProps {
  state: SaveState;
  className?: string;
}

const DOT_COLOR: Record<Exclude<SaveState, "idle">, string> = {
  saving: "bg-[#264D8E]",
  saved: "bg-[#24a148]",
  error: "bg-[#da1e28]",
};

/**
 * Inline "saving / saved / couldn't save" indicator for autosaving forms.
 *
 * Autosave is only trustworthy if it's visible: without this the counsellor
 * can't tell an edit that reached the server from one still sitting in the
 * debounce window, and a failed write looks identical to a successful one.
 * Renders nothing when idle so it doesn't add noise before the first edit.
 */
export const SaveStatus: FC<SaveStatusProps> = ({ state, className = "" }) => {
  const { t } = useTranslation();

  if (state === "idle") return null;

  const label =
    state === "saving"
      ? t("summary.autosave.saving", "Saving…")
      : state === "saved"
        ? t("summary.autosave.saved", "All changes saved")
        : t("summary.autosave.error", "Couldn't save — we'll keep trying");

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-primary text-xs ${
        state === "error" ? "text-[#da1e28]" : "text-[#525252]"
      } ${className}`}
      // Announce the outcome without stealing focus mid-typing.
      role="status"
      aria-live="polite"
      data-testid="save-status"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLOR[state]}`} />
      {label}
    </span>
  );
};

export default SaveStatus;
