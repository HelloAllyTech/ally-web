/** Which node the builder canvas is currently editing. */
export type TrackSelection = "settings" | { sectionIndex: number; itemIndex: number };

export const isSettingsSelection = (selection: TrackSelection): selection is "settings" =>
  selection === "settings";

export const isSameItemSelection = (
  selection: TrackSelection,
  sectionIndex: number,
  itemIndex: number,
): boolean =>
  selection !== "settings" &&
  selection.sectionIndex === sectionIndex &&
  selection.itemIndex === itemIndex;
