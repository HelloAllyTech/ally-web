const REVIEW_PRIVACY_OPTIONS = (t?: (key: string) => string) => [
  { label: t ? t("review.privacy.private") : "Keep it private", value: "HIDDEN" },
  { label: t ? t("review.privacy.share") : "Share for review", value: "IN_REVIEW" },
];

export { REVIEW_PRIVACY_OPTIONS };

export const REVIEW_PRIVACY_OPTIONS_VALUES = {
  HIDDEN: "HIDDEN",
  IN_REVIEW: "IN_REVIEW",
};
