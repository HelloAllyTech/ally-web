import { FC, useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useSubmitCallFeedbackMutation } from "@api";
import { Button, StarRating, TextField } from "@components";
import { IssueOptions } from "@types";

import { FeedbackSectionProps } from "../types";

export const CallFeedback: FC<FeedbackSectionProps> = ({ id, onSubmitComplete }) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [issues, setIssues] = useState<IssueOptions[]>([]);

  const issueOptions = [
    { text: t("callFeedback.issues.missingKeyInfo"), value: IssueOptions.MISSING_KEY_INFORMATION },
    { text: t("callFeedback.issues.inaccurate"), value: IssueOptions.INACCURATE },
    { text: t("callFeedback.issues.tooVague"), value: IssueOptions.TOO_VAGUE },
    {
      text: t("callFeedback.issues.difficultToUnderstand"),
      value: IssueOptions.DIFFICULT_TO_UNDERSTAND,
    },
    { text: t("callFeedback.issues.tooShort"), value: IssueOptions.TOO_SHORT },
    { text: t("callFeedback.issues.other"), value: IssueOptions.OTHER },
  ];

  const isPrevFive = useRef<boolean | null>(null);

  const [submitCallFeedback, { isLoading }] = useSubmitCallFeedbackMutation();

  // Reset comment and issues when switching between 5-star and non-5-star ratings
  useEffect(() => {
    const isFive = rating === 5;
    if (isPrevFive.current !== null && isPrevFive.current !== isFive) {
      setComment("");
      setIssues([]);
    }
    isPrevFive.current = isFive;
  }, [rating]);

  const isSubmitDisabled =
    rating === null ||
    (rating <= 4 &&
      (issues.length === 0 || (issues.includes(IssueOptions.OTHER) && comment === ""))) ||
    isLoading;

  const getCallRatingText = (rating: number) => {
    const key = String(rating) as "1" | "2" | "3" | "4" | "5";
    return t(`callFeedback.ratings.${key}`, "");
  };

  const onIssueClick = (option: IssueOptions) => {
    setIssues(prev => (prev.includes(option) ? prev.filter(x => x !== option) : [...prev, option]));
  };

  const onSubmit = async () => {
    const response = await submitCallFeedback({
      chatId: id.toString(),
      rating,
      feedback: { issues, comment },
    });

    if (response.error) {
      logger.info(`Error submitting feedback: ${response.error}`);
    } else if (response.data) {
      toast.success(t("callFeedback.submitted"));
      onSubmitComplete();
    }
  };

  const getFeedbackSection = (rating: number): JSX.Element | null => {
    if (rating === null) {
      return null;
    }
    if (rating === 5) {
      return (
        <>
          <span className="text-typography-900 text-base text-center">
            {t("callFeedback.moreSuggestions")}
          </span>
          <TextField
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={t("callFeedback.suggestionPlaceholder")}
            multiline
            rows={4}
            fullWidth
            className="w-full"
          />
        </>
      );
    } else {
      return (
        <>
          <span className="text-typography-900 font-medium text-center">
            {t("callFeedback.selectIssues")}
          </span>
          <div className="flex flex-wrap gap-2 justify-center w-full">
            {issueOptions.map(({ text, value }) => {
              const selected = issues.includes(value);
              return (
                <div
                  key={value}
                  onClick={() => onIssueClick(value)}
                  className={`text-base rounded-full border  py-1 px-2 cursor-pointer ${selected ? "border-[#5F99FC] text-primary-500" : "border-[#D8D8D8] text-typography-700"}`}
                >
                  {text}
                </div>
              );
            })}
          </div>
          <AnimatePresence initial={false}>
            {issues.includes(IssueOptions.OTHER) && (
              <motion.div
                key="other-textfield"
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: "hidden", width: "100%" }}
              >
                <TextField
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={t("callFeedback.concernPlaceholder")}
                  multiline
                  rows={4}
                  fullWidth
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      );
    }
  };

  return (
    <>
      <span className="text-typography-900 font-medium">{t("callFeedback.rateTitle")}</span>
      <span className="text-typography-800 text-base text-center">
        {t("callFeedback.rateSubtitle")}
      </span>
      <span className={`text-typography-900 text-base ${rating === null ? "hidden" : ""}`}>
        {getCallRatingText(rating)}
      </span>
      <StarRating rating={rating} setRating={setRating} />

      <AnimatePresence mode="wait">
        {rating !== null ? (
          <motion.div
            key={rating === 5 ? "positive" : "negative"}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden", width: "100%" }}
            className="flex flex-col items-center gap-4"
          >
            {getFeedbackSection(rating)}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Button onClick={onSubmit} disabled={isSubmitDisabled}>
        {isLoading ? t("callFeedback.submitting") : t("callFeedback.submit")}
      </Button>
    </>
  );
};
