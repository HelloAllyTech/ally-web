import { FC, useState, useEffect, useRef } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSubmitSimulationFeedbackMutation } from "@api";
import { Button, StarRating, TextField } from "@components";

import { FeedbackSectionProps } from "../types";

export const SimulationFeedback: FC<FeedbackSectionProps> = ({
  id,
  onSubmitComplete,
  initialRating,
  initialComment,
  initialTags,
}) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [comment, setComment] = useState<string>(initialComment ?? "");
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags ?? []);

  const [submitSimulationFeedback, { isLoading }] = useSubmitSimulationFeedbackMutation();
  const isFirstRender = useRef(true);

  const hasRating = rating >= 1 && rating <= 5;
  const isSubmitDisabled = !hasRating || isLoading;

  const getSimulationRatingText = (value: number) => {
    if (value < 1 || value > 5) return "";
    return t(`postSim.feedback.dialog.rating.${value}`);
  };

  const getSimulationRatingTags = (value: number): string[] => {
    if (value < 1 || value > 5) return [];
    return t(`postSim.feedback.dialog.rating.tags.${value}`, { returnObjects: true }) as string[];
  };

  // Tags are rating-specific, so a fresh rating starts with a clean slate —
  // except on the very first render, where we honour any pre-selected tags.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSelectedTags([]);
  }, [rating]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const onSubmit = async () => {
    const response = await submitSimulationFeedback({
      sessionId: id.toString(),
      sessionFeedback: { rating, feedback: comment, tags: selectedTags },
    });
    if (response.error) {
      throw new Error();
    } else if (response.data) {
      toast.success("Feedback submitted successfully");
      onSubmitComplete();
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-5 text-center">
      <h2 className="max-w-sm text-lg font-medium leading-snug text-typography-900">
        {t("postSim.feedback.dialog.header")}
      </h2>

      <StarRating
        rating={rating}
        setRating={setRating}
        size="lg"
        ariaLabel={t("postSim.feedback.dialog.header")}
      />

      {/* Reserve the row height so selecting a rating doesn't shift the layout. */}
      <span className="flex h-6 items-center text-sm font-medium text-typography-700">
        {getSimulationRatingText(rating)}
      </span>

      {hasRating && (
        <div className="flex flex-wrap justify-center gap-2">
          {getSimulationRatingTags(rating).map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`cursor-pointer select-none rounded-full border px-3 py-1 text-sm font-medium transition-all duration-150
                ${
                  selectedTags.includes(tag)
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-typography-600 border-gray-300 hover:border-primary-400 hover:text-primary-600"
                }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <TextField
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Tell us how we can improve..."
        multiline
        rows={4}
        fullWidth
        className="w-full"
      />

      <Button onClick={onSubmit} disabled={isSubmitDisabled} fullWidth>
        {isLoading ? "Submitting..." : "Submit"}
      </Button>
    </div>
  );
};
