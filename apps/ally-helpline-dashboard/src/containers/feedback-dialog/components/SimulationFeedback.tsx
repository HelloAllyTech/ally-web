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

  const isSubmitDisabled = rating === 0 || isLoading;

  const getSimulationRatingText = (rating: number) => {
    if (rating < 1 || rating > 5) return "";
    return t(`postSim.feedback.dialog.rating.${rating}`);
  };

  const getSimulationRatingTags = (rating: number): string[] => {
    if (rating < 1 || rating > 5) return [];
    return t(`postSim.feedback.dialog.rating.tags.${rating}`, { returnObjects: true }) as string[];
  };

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
    <>
      <span className="text-typography-800 font-medium">{t("postSim.feedback.dialog.header")}</span>
      <StarRating rating={rating} setRating={setRating} />
      <span className="h-6">{getSimulationRatingText(rating)}</span>
      {rating >= 1 && rating <= 5 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {getSimulationRatingTags(rating).map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-2 py-1 rounded-full text-sm font-medium border transition-all duration-150 cursor-pointer select-none
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
      <Button onClick={onSubmit} disabled={isSubmitDisabled}>
        {isLoading ? "Submitting..." : "Submit"}
      </Button>
    </>
  );
};
