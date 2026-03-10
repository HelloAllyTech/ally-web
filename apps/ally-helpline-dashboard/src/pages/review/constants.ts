export const FILTER_OPTIONS = (t: any) => [
  { value: "ALL", label: t("review.filter.all") },
  { value: "LATEST", label: t("review.filter.latest") },
  { value: "MOST_REVIEWED", label: t("review.filter.mostReviewed") },
  { value: "UNDISCOVERED", label: t("review.filter.undiscovered") },
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
  { label: "Simulation", value: ReviewTab.SIMULATION },
  { label: "Scribe", value: ReviewTab.SCRIBE },
];
