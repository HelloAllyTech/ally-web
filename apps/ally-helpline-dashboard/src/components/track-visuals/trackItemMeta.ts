import { TFunction } from "i18next";

import { TrackDetailItem, TrackItemType } from "@types";

/**
 * Builds the small meta line under a track item title on the journey map,
 * e.g. "7 questions · pass 70%" or "4 min video".
 */
export const getTrackItemMeta = (item: TrackDetailItem, t: TFunction): string => {
  const meta = item.contentMeta;
  const criteria = item.completionCriteria;

  switch (item.type) {
    case TrackItemType.QUIZ: {
      const parts: string[] = [];
      if (meta?.questionCount) {
        parts.push(t("tracks2.meta.questions", { count: meta.questionCount }));
      }
      const passScore = meta?.passScore ?? criteria?.passScore;
      if (passScore) parts.push(t("tracks2.meta.passScore", { score: passScore }));
      return parts.length ? parts.join(" · ") : t("tracks2.meta.quiz");
    }
    case TrackItemType.VIDEO: {
      if (meta?.durationSeconds) {
        const minutes = Math.max(1, Math.round(meta.durationSeconds / 60));
        return t("tracks2.meta.videoDuration", { minutes });
      }
      return t("tracks2.meta.video");
    }
    case TrackItemType.JOURNAL: {
      if (meta?.promptCount) {
        return t("tracks2.meta.prompts", { count: meta.promptCount });
      }
      return t("tracks2.meta.journal");
    }
    case TrackItemType.ARTICLE:
      return t("tracks2.meta.article");
    case TrackItemType.ROLEPLAY: {
      // A minScore of 0 is the unconfigured default and gates nothing (see
      // meetsMinimumScore in ally-be), so only a real threshold is shown —
      // advertising "min score 0" would read as a hurdle that isn't there.
      if ((criteria?.minScore ?? 0) > 0) {
        return `${t("tracks2.meta.roleplay")} · ${t("tracks2.meta.minScore", {
          score: criteria.minScore,
        })}`;
      }
      return t("tracks2.meta.roleplay");
    }
    case TrackItemType.CASE:
      return t("tracks2.meta.case");
    case TrackItemType.GAME:
      // No score or threshold in the meta line — there isn't one, and hinting
      // at one would make an optional break look like another hurdle.
      return t("tracks2.meta.game");
    case TrackItemType.ANNOTATED_ARTIFACT: {
      const parts: string[] = [
        meta?.kind === "DOCUMENT"
          ? t("tracks2.meta.annotationDocument")
          : t("tracks2.meta.annotationTranscript"),
      ];
      if (meta?.unitCount) parts.push(t("tracks2.meta.lines", { count: meta.unitCount }));
      if (meta?.labelCount) parts.push(t("tracks2.meta.labels", { count: meta.labelCount }));
      return parts.join(" · ");
    }
    default:
      return "";
  }
};
