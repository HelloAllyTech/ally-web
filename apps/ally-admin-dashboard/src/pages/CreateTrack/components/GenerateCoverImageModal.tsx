import { FC, useEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { useLazyGetTrackCoverImageJobQuery, useStartTrackCoverImageJobMutation } from "@api";
import { Close } from "@assets";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { KeyboardKeys } from "@constants";
import {
  IMAGE_GENERATION_FAILED_MESSAGE,
  ImageGenerationError,
  useImageGenerationJob,
} from "@hooks";
import { GenerateTrackCoverImageInput } from "@types";

import { COVER_PROMPT_MAX_LENGTH, COVER_PROMPT_MIN_LENGTH } from "../coverImagePrompt";

interface GenerateCoverImageModalProps {
  /** What the textarea opens with: the trainer's last prompt, or the default. */
  initialPrompt: string;
  /** "Reset to default" restores this — built from the course's current title and description. */
  defaultPrompt: string;
  trackTitle?: string;
  onPromptChange: (prompt: string) => void;
  /** The trainer accepted this image; the caller puts it in the form. */
  onAccept: (imageUrl: string) => void;
  onClose: () => void;
}

/**
 * Track settings → Generate cover image. One prompt in, one image out, and
 * the trainer decides: accept puts it in the form (the course's own Save
 * persists it, exactly like an upload); reject discards it and returns to the
 * prompt, which is kept so it can be tweaked and run again.
 */
export const GenerateCoverImageModal: FC<GenerateCoverImageModalProps> = ({
  initialPrompt,
  defaultPrompt,
  trackTitle,
  onPromptChange,
  onAccept,
  onClose,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startJob] = useStartTrackCoverImageJobMutation();
  const [pollJob] = useLazyGetTrackCoverImageJobQuery();
  // Generation runs as a backend job — it can outlast the load balancer's 60 s
  // timeout — so this starts it and polls until it settles.
  const { generate, isGenerating } = useImageGenerationJob(
    (input: GenerateTrackCoverImageInput) => startJob(input).unwrap(),
    (jobId: string) => pollJob(jobId).unwrap(),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // A response that lands after the trainer closed the pop-up is dropped.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    textareaRef.current?.focus();
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === KeyboardKeys.ESCAPE) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const trimmedPrompt = prompt.trim();
  const canGenerate = trimmedPrompt.length >= COVER_PROMPT_MIN_LENGTH && !isGenerating;

  const updatePrompt = (value: string) => {
    setPrompt(value);
    onPromptChange(value);
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setError(null);
    try {
      const imageUrl = await generate({
        prompt: trimmedPrompt,
        ...(trackTitle?.trim() ? { trackTitle: trackTitle.trim() } : {}),
      });
      if (imageUrl && isMountedRef.current) setGeneratedUrl(imageUrl);
    } catch (err) {
      if (isMountedRef.current) {
        setError(
          err instanceof ImageGenerationError ? err.message : IMAGE_GENERATION_FAILED_MESSAGE,
        );
      }
    }
  };

  const handleReject = () => {
    setGeneratedUrl(null);
    // Back to the prompt so the next attempt starts from what they wrote.
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const isReviewing = !!generatedUrl;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        // A stray click must not throw away a generation in flight or one waiting for a decision.
        onClick={isGenerating || isReviewing ? undefined : onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate-cover-image-title"
        className="relative z-10 w-[calc(100%-2rem)] max-w-[560px] max-h-[90vh] bg-white rounded-md shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border-light">
          <h3 id="generate-cover-image-title" className="text-sm font-semibold text-typography-900">
            Generate a cover image
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-typography-500 hover:text-typography-700"
          >
            <Close className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {generatedUrl ? (
            <>
              <div className="w-full aspect-[3/2] rounded-md overflow-hidden bg-gray-100">
                <CustomImage
                  src={generatedUrl}
                  alt="Generated cover image"
                  loading="eager"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-typography-500">
                Use it as this course&apos;s cover, or reject it to edit the prompt and try again.
                An accepted image is kept when you save the course.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="generate-cover-image-prompt"
                  className="text-sm font-medium text-typography-800"
                >
                  Prompt
                </label>
                <button
                  type="button"
                  onClick={() => updatePrompt(defaultPrompt)}
                  disabled={isGenerating || prompt === defaultPrompt}
                  className="text-xs text-primary-500 hover:text-primary-600 disabled:text-typography-400 disabled:cursor-not-allowed"
                >
                  Reset to default
                </button>
              </div>
              <textarea
                id="generate-cover-image-prompt"
                ref={textareaRef}
                value={prompt}
                onChange={event => updatePrompt(event.target.value)}
                disabled={isGenerating}
                maxLength={COVER_PROMPT_MAX_LENGTH}
                rows={14}
                className="w-full border border-border-light rounded-md px-3 py-2 text-sm leading-relaxed outline-none focus:border-primary-400 resize-y disabled:bg-gray-50 disabled:text-typography-500"
              />
              <p className="text-xs text-typography-500">
                Describe the picture you want. The image is made from this text exactly as written,
                so keep the rules at the end unless you mean to change them.
              </p>
              {isGenerating && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-md bg-secondary-50 px-3 py-2 text-sm text-typography-700"
                >
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
                  Generating your image — this usually takes under a minute.
                </div>
              )}
              {error && !isGenerating && (
                <p role="alert" className="text-sm text-destructive-500">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-light">
          {generatedUrl ? (
            <>
              <Button
                type="button"
                variant={ButtonVariant.SECONDARY}
                className="!h-9 text-sm"
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button type="button" className="!h-9 text-sm" onClick={() => onAccept(generatedUrl)}>
                Use as cover
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant={ButtonVariant.SECONDARY}
                className="!h-9 text-sm"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="!h-9 text-sm"
                onClick={handleGenerate}
                disabled={!canGenerate}
              >
                {isGenerating ? "Generating…" : error ? "Try again" : "Generate"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
