/**
 * Tailwind class tokens for the IBM Carbon-inspired styling used by the manual
 * "New note" drawer (and any field renderer it drives via `variant="carbon"`).
 *
 * Carbon design language, adapted to the app's serif type system:
 * - IBM Plex Serif everywhere (`font-primary`), per the serif-only requirement.
 * - Sharp corners (no border radius), 8px spacing grid, 40px field height.
 * - Fields: gray fill (#f0eee7 `field-01`) + a single bottom border
 *   (#928b7c `border-strong`); focus thickens the bottom border to 2px brand
 *   blue (#cc785c). Labels sit above the field in 12px secondary text
 *   (#565045 `text-secondary`).
 *
 * Scoped to the drawer only — the post-call summary page keeps its existing look.
 */
export const carbonField = {
  sectionHeader:
    "font-primary text-sm font-semibold uppercase tracking-wide text-[#29261f] border-b border-[#e3dbce] pb-2 mb-4",
  group: "flex flex-col gap-1.5",
  label: "font-primary text-xs leading-4 text-[#565045]",
  input:
    "w-full h-10 bg-[#f0eee7] text-[#29261f] font-primary text-sm px-4 rounded-none border-0 border-b border-[#928b7c] outline-none transition-colors placeholder:text-[#928b7c] focus:border-b-2 focus:border-[#cc785c] disabled:text-[#bcb4a4] disabled:cursor-not-allowed",
  textarea:
    "w-full bg-[#f0eee7] text-[#29261f] font-primary text-sm p-4 rounded-none border-0 border-b border-[#928b7c] outline-none transition-colors placeholder:text-[#928b7c] focus:border-b-2 focus:border-[#cc785c] disabled:text-[#bcb4a4] resize-y min-h-[6rem]",
  select:
    "w-full h-10 bg-[#f0eee7] text-[#29261f] font-primary text-sm pl-4 pr-9 rounded-none border-0 border-b border-[#928b7c] outline-none focus:border-b-2 focus:border-[#cc785c] disabled:text-[#bcb4a4] disabled:cursor-not-allowed appearance-none",
  selectChevron:
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#29261f]",
  checkbox: "h-4 w-4 rounded-none accent-[#cc785c]",
  checkboxRow: "flex items-center gap-2 font-primary text-sm text-[#29261f]",
} as const;
