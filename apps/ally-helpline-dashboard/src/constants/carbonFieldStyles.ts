/**
 * Tailwind class tokens for the IBM Carbon-inspired styling used by the manual
 * "New note" drawer (and any field renderer it drives via `variant="carbon"`).
 *
 * Carbon design language, adapted to the app's serif type system:
 * - IBM Plex Serif everywhere (`font-primary`), per the serif-only requirement.
 * - Sharp corners (no border radius), 8px spacing grid, 40px field height.
 * - Fields: gray fill (#f4f4f4 `field-01`) + a single bottom border
 *   (#8d8d8d `border-strong`); focus thickens the bottom border to 2px brand
 *   blue (#264D8E). Labels sit above the field in 12px secondary text
 *   (#525252 `text-secondary`).
 *
 * Scoped to the drawer only — the post-call summary page keeps its existing look.
 */
export const carbonField = {
  sectionHeader:
    "font-primary text-sm font-semibold uppercase tracking-wide text-[#161616] border-b border-[#e0e0e0] pb-2 mb-4",
  group: "flex flex-col gap-1.5",
  label: "font-primary text-xs leading-4 text-[#525252]",
  input:
    "w-full h-10 bg-[#f4f4f4] text-[#161616] font-primary text-sm px-4 rounded-none border-0 border-b border-[#8d8d8d] outline-none transition-colors placeholder:text-[#a8a8a8] focus:border-b-2 focus:border-[#264D8E] disabled:text-[#c6c6c6] disabled:cursor-not-allowed",
  textarea:
    "w-full bg-[#f4f4f4] text-[#161616] font-primary text-sm p-4 rounded-none border-0 border-b border-[#8d8d8d] outline-none transition-colors placeholder:text-[#a8a8a8] focus:border-b-2 focus:border-[#264D8E] disabled:text-[#c6c6c6] resize-y min-h-[6rem]",
  select:
    "w-full h-10 bg-[#f4f4f4] text-[#161616] font-primary text-sm pl-4 pr-9 rounded-none border-0 border-b border-[#8d8d8d] outline-none focus:border-b-2 focus:border-[#264D8E] disabled:text-[#c6c6c6] disabled:cursor-not-allowed appearance-none",
  selectChevron:
    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#161616]",
  checkbox: "h-4 w-4 rounded-none accent-[#264D8E]",
  checkboxRow: "flex items-center gap-2 font-primary text-sm text-[#161616]",
} as const;
