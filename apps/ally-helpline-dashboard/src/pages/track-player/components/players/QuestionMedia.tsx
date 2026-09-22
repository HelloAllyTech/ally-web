import { FC, useState } from "react";

import { useTranslation } from "react-i18next";

import { QuestionMedia as QuestionMediaValue } from "@types";

interface QuestionMediaProps {
  media: QuestionMediaValue | undefined;
}

/** Embeddable player URL for a third-party clip. Mirrors the admin parser. */
const embedUrlFor = (media: QuestionMediaValue): string | null => {
  const url = media.url.trim();
  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/,
  );
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const loom = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  return null;
};

/**
 * The picture or clip a question is asking about, rendered between the prompt
 * and the answer controls. Shared by the quiz player, the video-interjection
 * overlay and inline article questions, because all three render the same
 * sanitized `QuizQuestion` and a learner should not meet three different
 * treatments of the same field.
 *
 * Three things this deliberately does:
 *
 *  - **Never autoplays.** The learner decides when the clip runs and can
 *    replay it as often as they need; a question they cannot re-watch is a
 *    memory test wearing a video's clothes.
 *  - **Offers a full-size view of images.** If the question is "what do you
 *    notice here", a 220px-tall thumbnail on a phone is the wrong instrument.
 *  - **Says so when an image fails.** A broken-image glyph on a bad
 *    connection reads as "this question is broken"; the description the
 *    trainer wrote is a better fallback than nothing.
 */
export const QuestionMedia: FC<QuestionMediaProps> = ({ media }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!media?.url) return null;

  if (media.kind === "image") {
    if (failed) {
      return (
        <div
          data-testid="question-media-failed"
          className="mb-4 rounded-[12px] border border-border-light bg-neutral-50 p-3 text-sm text-typography-600"
        >
          {t("tracks2.question.media.imageFailed")}
          {media.alt ? <span className="mt-1 block italic">{media.alt}</span> : null}
        </div>
      );
    }
    return (
      <>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={t("tracks2.question.media.viewLarger")}
          className="mb-4 block w-full cursor-zoom-in overflow-hidden rounded-[12px] border border-border-light bg-neutral-50"
        >
          <img
            data-testid="question-media-image"
            src={media.url}
            alt={media.alt ?? ""}
            onError={() => setFailed(true)}
            className="max-h-[320px] w-full object-contain"
          />
        </button>
        {expanded && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={media.alt || t("tracks2.question.media.viewLarger")}
            onClick={() => setExpanded(false)}
            className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
          >
            <img
              src={media.url}
              alt={media.alt ?? ""}
              className="max-h-full max-w-full object-contain"
            />
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-typography-900"
            >
              {t("tracks2.question.media.close")}
            </button>
          </div>
        )}
      </>
    );
  }

  if (media.source === "s3") {
    return (
      <video
        data-testid="question-media-video"
        src={media.url}
        poster={media.posterUrl}
        controls
        preload="metadata"
        playsInline
        className="mb-4 max-h-[320px] w-full rounded-[12px] bg-black"
      />
    );
  }

  const embedUrl = embedUrlFor(media);
  if (!embedUrl) {
    return (
      <a
        href={media.url}
        target="_blank"
        rel="noreferrer noopener"
        className="mb-4 block text-sm text-primary-500 underline"
      >
        {t("tracks2.question.media.openVideo")}
      </a>
    );
  }
  return (
    <div className="mb-4 aspect-video w-full overflow-hidden rounded-[12px]">
      <iframe
        data-testid="question-media-embed"
        src={embedUrl}
        title={t("tracks2.question.media.videoTitle")}
        className="h-full w-full"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
};
