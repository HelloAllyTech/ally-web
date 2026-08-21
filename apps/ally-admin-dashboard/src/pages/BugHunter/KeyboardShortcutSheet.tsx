import { FC, useEffect, useRef } from "react";

import { en } from "@constants";

/**
 * The `?` overlay listing what the keyboard does on this tab.
 *
 * ## Why a sheet and not a tooltip on a button
 *
 * Shortcuts that aren't discoverable are shortcuts nobody uses, and a page with
 * nine of them cannot introduce them in a tooltip. The pattern every tool with
 * a triage queue converges on — a `?` sheet plus a persistent hint — is here for
 * the ordinary reason that it works: the hint tells you the sheet exists, and
 * the sheet is where you learn the rest.
 *
 * ## Not Carbon's Modal
 *
 * `ActionConfirmationPopup` is this console's confirm dialog and is the right
 * thing for a decision. This is not a decision — it is a reference card with no
 * action on it but "close" — so it stays a plain dialog rather than borrowing a
 * component whose whole shape is primary-and-secondary-button.
 *
 * Focus moves to the close button on open and Escape closes, which is the
 * minimum a dialog owes a keyboard user — and it would be a poor joke for the
 * keyboard-shortcuts overlay to be the one thing on the page you need a mouse
 * to dismiss.
 */

export interface KeyboardShortcutSheetProps {
  onClose: () => void;
}

/** One row of the sheet. `keys` render as separate key caps. */
interface Shortcut {
  keys: string[];
  label: string;
}

/**
 * Built inside the component, never at module scope: this reads `en`, and a
 * top-level object off the `@constants` barrel is the pattern that broke nine
 * admin suites once already — see the note in `agentPersona.ts`.
 */
const shortcutGroups = (): { title: string; shortcuts: Shortcut[] }[] => [
  {
    title: en.bugHunter.shortcutsGroupMove,
    shortcuts: [
      { keys: ["j", "↓"], label: en.bugHunter.shortcutMoveDown },
      { keys: ["k", "↑"], label: en.bugHunter.shortcutMoveUp },
      { keys: ["o"], label: en.bugHunter.shortcutOpen },
      { keys: ["/"], label: en.bugHunter.shortcutSearch },
      { keys: ["Esc"], label: en.bugHunter.shortcutEscape },
      { keys: ["?"], label: en.bugHunter.shortcutHelp },
    ],
  },
  {
    title: en.bugHunter.shortcutsGroupAct,
    shortcuts: [
      { keys: ["a"], label: en.bugHunter.shortcutApprove },
      { keys: ["r"], label: en.bugHunter.shortcutReject },
      { keys: ["f"], label: en.bugHunter.shortcutFix },
    ],
  },
  {
    title: en.bugHunter.shortcutsGroupSelect,
    shortcuts: [
      { keys: ["x"], label: en.bugHunter.shortcutToggleSelect },
      { keys: ["shift", "X"], label: en.bugHunter.shortcutSelectPage },
    ],
  },
];

const KeyCap: FC<{ children: string }> = ({ children }) => (
  <kbd className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded border border-border-light bg-neutral-50 text-[11px] font-mono text-typography-800">
    {children}
  </kbd>
);

export const KeyboardShortcutSheet: FC<KeyboardShortcutSheetProps> = ({ onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Owns Escape while it is open, and stops it there — otherwise the same press
  // would also clear the table's selection underneath, which is two things
  // happening for one keystroke.
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", handle, true);
    return () => document.removeEventListener("keydown", handle, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      // Clicking the backdrop closes. The panel below stops propagation, so a
      // click inside it never reaches this.
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-hunter-shortcuts-heading"
        className="w-full max-w-lg max-h-full overflow-y-auto custom-scrollbar rounded-lg bg-white p-5 shadow-lg"
        onClick={event => event.stopPropagation()}
      >
        <h2
          id="bug-hunter-shortcuts-heading"
          className="text-base font-semibold text-typography-900"
        >
          {en.bugHunter.shortcutsTitle}
        </h2>
        <p className="text-xs text-typography-600 mt-1">{en.bugHunter.shortcutsIntro}</p>

        <div className="mt-4 flex flex-col gap-4">
          {shortcutGroups().map(group => (
            <div key={group.title}>
              {/* Serif: a group heading is a word, not a key. The `<kbd>` above
                  keeps its monospace, which is what the config's code/ID
                  carve-out is for. */}
              <p className="text-[11px] uppercase tracking-wide text-typography-500 mb-2">
                {group.title}
              </p>
              <ul className="flex flex-col gap-1.5">
                {group.shortcuts.map(shortcut => (
                  <li key={shortcut.label} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-typography-800">{shortcut.label}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {shortcut.keys.map(key => (
                        <KeyCap key={key}>{key}</KeyCap>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded border border-border-light px-3 py-1.5 text-sm text-typography-800 cursor-pointer hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {en.bugHunter.shortcutsClose}
          </button>
        </div>
      </div>
    </div>
  );
};
