/** Which node the builder canvas is currently editing. */
export type TrackSelection =
  | "settings"
  | "translations"
  | { sectionIndex: number; itemIndex: number };

export const isSettingsSelection = (selection: TrackSelection): selection is "settings" =>
  selection === "settings";

export const isTranslationsSelection = (
  selection: TrackSelection,
): selection is "translations" => selection === "translations";

export const isSameItemSelection = (
  selection: TrackSelection,
  sectionIndex: number,
  itemIndex: number,
): boolean =>
  typeof selection !== "string" &&
  selection.sectionIndex === sectionIndex &&
  selection.itemIndex === itemIndex;
