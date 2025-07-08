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
  1: { bg: "#FEE1E180", text: "#C62828" },
  2: { bg: "#FFE8D580", text: "#F55A00" },
  3: { bg: "#EBEBEB80", text: "#424242" },
  4: { bg: "#D7F4DC80", text: "#388E3C" },
  5: { bg: "#B9EFC880", text: "#1B5E20" },
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
