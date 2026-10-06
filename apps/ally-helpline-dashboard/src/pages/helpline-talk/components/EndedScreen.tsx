import { FC, FormEvent, useId, useState } from "react";

import { useTranslation } from "react-i18next";

import { HELPLINE_LIMITS } from "@constants/helpline";
import type { GuestChatDto, GuestFeedbackBody } from "@types";

import { ResourcesCard } from "./ResourcesCard";
import { TalkerButton } from "./TalkerButton";
import { useFocusOnMount } from "./useFocusOnMount";

import type { TalkerMessage } from "../talkerReducer";

interface EndedScreenProps {
  chat: GuestChatDto;
  messages: TalkerMessage[];
  resourcesText: string | null;
  isSubmittingFeedback: boolean;
  onSubmitFeedback: (rating: GuestFeedbackBody["rating"], comment: string) => Promise<boolean>;
  onStartNew: () => void;
  onDelete: () => void;
}

const RATINGS = [1, 2, 3, 4, 5] as const;

/** The org's CLOSING text if the server sent one; null otherwise. */
const closingText = (messages: TalkerMessage[]) => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].systemKind === "CLOSING" && messages[index].content.trim()) {
      return messages[index].content;
    }
  }
  return null;
};

/**
 * After a chat. A talker who was talked to gets the closing text and one
 * question; a talker who only ever waited (left the queue, or nobody was free in
 * time) is not asked to rate a conversation that never happened. Everyone gets
 * the resources, Delete, and a way to start again.
 */
export const EndedScreen: FC<EndedScreenProps> = ({
  chat,
  messages,
  resourcesText,
  isSubmittingFeedback,
  onSubmitFeedback,
  onStartNew,
  onDelete,
}) => {
  const { t } = useTranslation();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const [rating, setRating] = useState<GuestFeedbackBody["rating"] | null>(null);
  const [comment, setComment] = useState("");
  const [feedbackError, setFeedbackError] = useState(false);
  const commentId = useId();
  const questionId = useId();

  const wasTalkedTo = Boolean(chat.claimedAt);
  const reason = chat.endedReason;
  const waitedOut = !wasTalkedTo && (reason === "WAIT_EXPIRED" || reason === "QUEUE_ABANDONED");

  const title = wasTalkedTo
    ? t("helplineTalker.ended.title")
    : waitedOut
      ? t("helplineTalker.ended.waitExpiredTitle")
      : t("helplineTalker.ended.leftQueueTitle");
  const body = wasTalkedTo
    ? (closingText(messages) ?? t("helplineTalker.ended.defaultClosing"))
    : waitedOut
      ? t("helplineTalker.ended.waitExpiredBody")
      : t("helplineTalker.ended.leftQueueBody");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!rating || isSubmittingFeedback) return;
    setFeedbackError(false);
    const ok = await onSubmitFeedback(rating, comment);
    if (!ok) setFeedbackError(true);
  };

  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-10 pt-8"
      data-testid="talker-ended"
    >
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-secondary text-2xl text-typography-900 focus:outline-none"
      >
        {title}
      </h1>
      <p className="whitespace-pre-line break-words font-primary text-base text-typography-800">
        {body}
      </p>

      {wasTalkedTo &&
        (chat.feedbackSubmitted ? (
          <p
            role="status"
            className="rounded-2xl bg-background-secondary p-4 font-primary text-base text-typography-900"
          >
            {t("helplineTalker.ended.thanks")}
          </p>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border-light bg-white p-4">
            <fieldset aria-labelledby={questionId}>
              <legend
                id={questionId}
                className="font-primary text-base font-medium text-typography-900"
              >
                {t("helplineTalker.ended.ratingQuestion")}
              </legend>
              <div className="mt-3 flex gap-2">
                {RATINGS.map(value => (
                  <label
                    key={value}
                    className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border font-primary text-base focus-within:ring-2 focus-within:ring-primary-500 ${
                      rating === value
                        ? "border-primary-500 bg-primary-500 text-white"
                        : "border-border-medium bg-white text-typography-900"
                    }`}
                  >
                    <input
                      type="radio"
                      name="helpline-rating"
                      value={value}
                      checked={rating === value}
                      onChange={() => setRating(value)}
                      className="sr-only"
                      aria-label={t("helplineTalker.ended.ratingOption", { count: value })}
                    />
                    <span aria-hidden="true">{value}</span>
                  </label>
                ))}
              </div>
              <div
                className="mt-1 flex max-w-[236px] justify-between font-primary text-xs text-typography-700"
                aria-hidden="true"
              >
                <span>{t("helplineTalker.ended.ratingLow")}</span>
                <span>{t("helplineTalker.ended.ratingHigh")}</span>
              </div>
            </fieldset>

            {rating && (
              <div className="mt-4 flex flex-col gap-1">
                <label htmlFor={commentId} className="font-primary text-base text-typography-900">
                  {t("helplineTalker.ended.commentLabel")}
                </label>
                <textarea
                  id={commentId}
                  rows={3}
                  value={comment}
                  maxLength={HELPLINE_LIMITS.FEEDBACK_COMMENT_MAX}
                  onChange={event => setComment(event.target.value)}
                  className="rounded-xl border border-border-medium bg-white px-4 py-2 font-primary text-base text-typography-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                />
              </div>
            )}

            {feedbackError && (
              <p role="alert" className="mt-3 font-primary text-sm text-destructive-700">
                {t("helplineTalker.ended.feedbackError")}
              </p>
            )}

            <TalkerButton type="submit" className="mt-4" disabled={!rating || isSubmittingFeedback}>
              {isSubmittingFeedback
                ? t("helplineTalker.ended.submitting")
                : t("helplineTalker.ended.submit")}
            </TalkerButton>
          </form>
        ))}

      <ResourcesCard text={resourcesText} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <TalkerButton variant="secondary" onClick={onStartNew}>
          {t("helplineTalker.ended.startNew")}
        </TalkerButton>
        <TalkerButton variant="ghost" className="text-destructive-700" onClick={onDelete}>
          {t("helplineTalker.header.deleteConversation")}
        </TalkerButton>
      </div>
    </div>
  );
};
