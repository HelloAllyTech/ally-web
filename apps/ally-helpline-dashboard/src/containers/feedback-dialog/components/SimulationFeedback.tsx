import { FC, useState } from "react";

import { toast } from "sonner";

import { useSubmitSimulationFeedbackMutation } from "@api";
import { Button, StarRating, TextField } from "@components";

import { FeedbackSectionProps } from "../types";

export const SimulationFeedback: FC<FeedbackSectionProps> = ({ id, onSubmitComplete }) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");

  const [submitSimulationFeedback, { isLoading }] = useSubmitSimulationFeedbackMutation();

  const isSubmitDisabled = rating === 0 || isLoading;

  const getSimulationRatingText = (rating: number) => {
    switch (rating) {
      case 1:
        return "Needs major improvements.";
      case 2:
        return "Could be better.";
      case 3:
        return "Decent, but room to grow.";
      case 4:
        return "Nice experience!";
      case 5:
        return "Excellent and highly effective!";
      default:
        return "";
    }
  };

  const onSubmit = async () => {
    const response = await submitSimulationFeedback({
      sessionId: id.toString(),
      sessionFeedback: { rating, feedback: comment },
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
      <span className="text-typography-600 font-medium">How was your experience?</span>
      <StarRating rating={rating} setRating={setRating} />
      <span className="h-6">{getSimulationRatingText(rating)}</span>
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
