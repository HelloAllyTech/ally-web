import { FC, useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useSubmitCallFeedbackMutation } from "@api";
import { Button, TextField } from "@components";
import StarRating from "@containers/simulation-summary-state/components/StarRating";
import { IssueOptions } from "@types";

import { issueOptions } from "../constants";
import { FeedbackSectionProps } from "../types";

export const CallFeedback: FC<FeedbackSectionProps> = ({ id, onSubmitComplete }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [issues, setIssues] = useState<IssueOptions[]>([]);

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
    switch (rating) {
      case 1:
        return "Poor quality - Needs significant improvement";
      case 2:
        return "Below expectations - Could be much better";
      case 3:
        return "Average quality - Meets basic expectations";
      case 4:
        return "Good quality - Above expectations";
      case 5:
        return "Excellent quality - Highly recommended";
      default:
        return "";
    }
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
      toast.success("Feedback submitted successfully");
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
          <span className="text-[#000000] text-[14px] text-center">Any more suggestions?</span>
          <TextField
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Anything else that you’d like to share about the summary?"
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
          <span className="text-[#000000] font-medium text-center">
            Please select one or more issues
          </span>
          <div className="flex flex-wrap gap-2 justify-center w-full">
            {issueOptions.map(({ text, value }) => {
              const selected = issues.includes(value);
              return (
                <div
                  key={value}
                  onClick={() => onIssueClick(value)}
                  className={`text-[14px] rounded-full border  py-1 px-2 cursor-pointer ${selected ? "border-[#5F99FC] text-[#0957D0]" : "border-[#D8D8D8] text-[#47464F]"}`}
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
                  placeholder="Describe your concern here."
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
      <span className="text-[#000000] font-medium">Rate the AI-generated summary?</span>
      <span className="text-[#6B7280] text-[14px] text-center">
        Please rate the quality, let us know what worked well, and share areas for improvement.
      </span>
      <span className={`text-[#000000] text-[14px] ${rating === null ? "hidden" : ""}`}>
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
        {isLoading ? "Submitting..." : "Submit"}
      </Button>
    </>
  );
};
