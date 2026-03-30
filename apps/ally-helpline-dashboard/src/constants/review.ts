const REVIEW_PRIVACY_OPTIONS = (t?: (key: string) => string) => [
  { label: t ? t("review.privacy.private") : "Keep it private", value: "HIDDEN" },
  { label: t ? t("review.privacy.share") : "Share for review", value: "IN_REVIEW" },
];

export { REVIEW_PRIVACY_OPTIONS };

export const REVIEW_PRIVACY_OPTIONS_VALUES = {
  HIDDEN: "HIDDEN",
  IN_REVIEW: "IN_REVIEW",
};

export const COMMENT_MAX_LENGTH = 1250;

export const COMMENT_DELETE_CONFIRMATION = {
  COMMENT_DELETE_MESSAGE:
    "Are you sure you want to permanently remove this comment from the conversation?",
  REPLY_DELETE_MESSAGE: "Deleting the reply will remove it from the conversation",
};
