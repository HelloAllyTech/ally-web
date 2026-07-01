import { Permissions } from "@constants";

export const SCRIBE_READ_FILTER_OPTIONS = (t: any) => [
  { value: "ALL", label: t("review.filter.all") },
  { value: "UNDISCOVERED", label: t("review.filter.undiscovered") },
];

export const SCRIBE_SORT_OPTIONS = (t: any) => [
  { value: "LATEST", label: t("review.filter.latest") },
  { value: "MOST_REVIEWED", label: t("review.filter.mostReviewed") },
];

export const READ_FILTER_OPTIONS = (t: any) => [
  { value: "ALL", label: t("review.filter.all") },
  { value: "READ", label: t("review.filter.read") },
  { value: "UNREAD", label: t("review.filter.unread") },
];

export const SORT_OPTIONS = (t: any) => [
  { value: "LATEST", label: t("review.sort.latest") },
  { value: "MOST_VIEWED", label: t("review.sort.mostViewed") },
  { value: "MOST_COMMENTED", label: t("review.sort.mostCommented") },
];

export const PAGE_SIZE = 10;
export const SKELETON_COUNT = 3;

export const containerVariants = {
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
};

export enum ReviewTab {
  SCRIBE = "SCRIBE",
  SIMULATION = "SIMULATION",
}

export const TABS = [
  {
    labelKey: "review.tabs.scribe",
    value: ReviewTab.SCRIBE,
    permission: Permissions.VIEW_SCRIBE_REVIEWS,
  },
  {
    labelKey: "review.tabs.simulation",
    value: ReviewTab.SIMULATION,
    permission: Permissions.VIEW_SIMULATION_REVIEWS,
  },
];
