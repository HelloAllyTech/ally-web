export function shortId() {
  return "_" + Math.random().toString(36).substr(2, 9);
}

export const cellTypes = {
  editableText: "editableText",
  dropdown: "dropdown",
  dropdownSearchable: "dropdownSearchable",
  number: "number",
  image: "image",
  select: "select",
  switch: "switch",
  emoji_select: "emoji_select",
  normalText: "normalText",
  wrapText: "wrapText",
  triggerConditions: "triggerConditions",
  timeInput: "timeInput",
  score: "score",
  textAreaWithDropdown: "textAreaWithDropdown",
  tags: "tags",
  dropdownTags: "dropdownTags",
  status: "status",
  roles: "roles",
};

export const keyCodes = {
  enter: "Enter",
  escape: "Escape",
  arrowUp: "ArrowUp",
  arrowDown: "ArrowDown",
  mousedown: "mousedown",
};

type Token = { type: "text"; value: string } | { type: "highlight"; value: string };

export const tokenizeAngleText = (text: string): Token[] => {
  const regex = /<[^>]+>/g;
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    tokens.push({ type: "highlight", value: match[0] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
};
