export const tableHeaders = [
  {
    id: "callName",
    label: "Call ID",
    width: "15%",
  },
  {
    id: "dateAndTime",
    label: "Date & Time",
    width: "15%",
  },
  {
    id: "duration",
    label: "Duration",
    width: "15%",
  },
  {
    id: "qualityScore",
    label: "Quality Score",
    width: "15%",
  },
  {
    id: "tags",
    label: "Tags",
    width: "30%",
  },
  {
    id: "review",
    label: "Review",
    width: "10%",
  },
];

export const tagColors = {
  1: { bg: "#FFCDD2", text: "#5C0A0A" },
  2: { bg: "#FFE0B2", text: "#662400" },
  3: { bg: "#E0E0E0", text: "#333333" },
  4: { bg: "#B9EFC880", text: "#1B5E20" },
  5: { bg: "#D0F0C080", text: "#174F1B" },
};

export const CALL_LOGS_PAGINATION_LIMIT = 25;
export const TABLE_ROW_HEIGHT = 58; // 58px

export const tabStyles = {
  textTransform: "none",
  fontWeight: 500,
  color: "#49454F",
};

export const defaultDeleteDialogData = {
  open: false,
  chatId: null,
};

export const defaultTags = [
  { label: "Depression", value: "Depression" },
  { label: "Anxiety", value: "Anxiety" },
  { label: "Stress", value: "Stress" },
  { label: "Relationship", value: "Relationship" },
  { label: "Family", value: "Family" },
  { label: "Work", value: "Work" },
  { label: "Money", value: "Money" },
  { label: "Health", value: "Health" },
  { label: "Life", value: "Life" },
];
