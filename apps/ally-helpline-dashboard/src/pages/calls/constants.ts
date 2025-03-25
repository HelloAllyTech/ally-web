export const TABLE_HEADERS = [
  {
    id: "clientId",
    label: "Call ID",
  },
  {
    id: "dateAndTime",
    label: "Date & Time",
  },
  {
    id: "duration",
    label: "Duration",
  },
  {
    id: "quality_score",
    label: "Quality Score",
  },
  {
    id: "tags",
    label: "Tags",
  },
  {
    id: "notes",
    label: "Notes",
  },
];

export const DEFAULT_TAGS = [
  { tag: "Anxiety", positivity_rating: 1 },
  { tag: "Depression", positivity_rating: 2 },
  { tag: "Stress", positivity_rating: 3 },
  { tag: "Relationships", positivity_rating: 4 },
  { tag: "Work", positivity_rating: 5 },
];

export const TAG_COLORS = {
  1: { bg: "#FEE1E180", text: "#C62828" },
  2: { bg: "#FFE8D580", text: "#F55A00" },
  3: { bg: "#EBEBEB80", text: "#424242" },
  4: { bg: "#D7F4DC80", text: "#388E3C" },
  5: { bg: "#B9EFC880", text: "#1B5E20" },
};
