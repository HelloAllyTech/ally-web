export function shortId() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

export const cellTypes = {
  editableText: "editableText",
  dropdown: "dropdown",
  dropdownSearchable: "dropdownSearchable",
  number: "number",
  select: "select",
  switch: "switch",
  emoji_select: "emoji_select",
  normalText: "normalText",
  triggerConditions: "triggerConditions",
  timeInput: "timeInput",
  score: "score",
};

export const keyCodes = {
  enter: "Enter",
  escape: "Escape",
  arrowUp: "ArrowUp",
  arrowDown: "ArrowDown",
  mousedown: "mousedown",
};
