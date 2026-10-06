import { FC } from "react";

import { useTranslation } from "react-i18next";

import { HELPLINE_DEFAULT_EMERGENCY_NUMBERS } from "@constants/helpline";

interface ResourcesCardProps {
  /** The org's emergency-resources text for the talker's language, if any. */
  text?: string | null;
  title?: string;
  className?: string;
}

/**
 * Emergency numbers, shown on every screen a talker might be stuck on. Org text
 * when we have it; otherwise the platform default (112 / Tele-MANAS), so the
 * card is never empty.
 */
export const ResourcesCard: FC<ResourcesCardProps> = ({ text, title, className = "" }) => {
  const { t } = useTranslation();
  const body =
    text?.trim() ||
    t("helplineTalker.resources.fallback", {
      emergency: HELPLINE_DEFAULT_EMERGENCY_NUMBERS.EMERGENCY,
      teleManasShort: HELPLINE_DEFAULT_EMERGENCY_NUMBERS.TELE_MANAS_SHORT,
      teleManasLong: HELPLINE_DEFAULT_EMERGENCY_NUMBERS.TELE_MANAS_LONG,
    });

  return (
    <section
      aria-label={title ?? t("helplineTalker.resources.title")}
      className={`rounded-xl border border-primary-200 bg-primary-50 p-4 font-primary ${className}`}
      data-testid="helpline-resources"
    >
      <h2 className="text-base font-medium text-typography-900">
        {title ?? t("helplineTalker.resources.title")}
      </h2>
      <p className="mt-1 whitespace-pre-line break-words text-base text-typography-900">{body}</p>
    </section>
  );
};

/** Resources text for a language, falling back to English, then to nothing. */
export const resourcesFor = (resources: Record<string, string> | undefined, language: string) =>
  resources?.[language]?.trim() || resources?.en?.trim() || null;
