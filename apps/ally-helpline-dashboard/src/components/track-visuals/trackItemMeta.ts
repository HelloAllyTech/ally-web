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
      if (criteria?.minScore) {
        return `${t("tracks2.meta.roleplay")} · ${t("tracks2.meta.minScore", {
          score: criteria.minScore,
        })}`;
      }
      return t("tracks2.meta.roleplay");
    }
    case TrackItemType.CASE:
      return t("tracks2.meta.case");
    default:
      return "";
  }
};
