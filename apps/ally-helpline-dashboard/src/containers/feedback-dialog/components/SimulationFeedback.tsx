import { FC, useEffect, useState } from "react";

import { toast } from "sonner";

import { useGetRatingMetadataQuery, useSubmitSimulationFeedbackMutation } from "@api";
import { Button, StarRating, TextField } from "@components";

import { FeedbackSectionProps } from "../types";

export const SimulationFeedback: FC<FeedbackSectionProps> = ({
  id,
  onSubmitComplete,
  initialRating,
}) => {
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [comment, setComment] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [submitSimulationFeedback, { isLoading }] = useSubmitSimulationFeedbackMutation();
  const { data: ratingMetadata } = useGetRatingMetadataQuery();

  const isSubmitDisabled = rating === 0 || isLoading;

  const ratingData = rating > 0 ? (ratingMetadata?.[rating.toString()] ?? null) : null;

  useEffect(() => {
    setSelectedTags([]);
  }, [rating]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
  };

  const onSubmit = async () => {
    const response = await submitSimulationFeedback({
      sessionId: id.toString(),
      sessionFeedback: { rating, feedback: comment },
      // TODO: insert this tags into DB
      // tags: selectedTags,
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
      <span className="text-typography-800 font-medium">How was your experience?</span>
      <StarRating rating={rating} setRating={setRating} />
      <span className="h-6">{ratingData?.ratingText}</span>
      {ratingData && (
        <div className="flex flex-wrap justify-center gap-2">
          {ratingData.tags.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-2 text-sm capitalize transition-colors ${
                selectedTags.includes(tag)
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-border-300 bg-surface-50 text-typography-600 hover:border-primary-400 hover:text-primary-600"
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
