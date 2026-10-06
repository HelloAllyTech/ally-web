import { FC, FormEvent, useId, useState } from "react";

import { useTranslation } from "react-i18next";

import { HELPLINE_LIMITS } from "@constants/helpline";
import type { PublicStatusEnabled } from "@types";

import { ResourcesCard, resourcesFor } from "./ResourcesCard";
import { TalkerButton } from "./TalkerButton";
import { useFocusOnMount } from "./useFocusOnMount";

import type { TalkerNotice } from "../talkerReducer";

interface ConsentScreenProps {
  status: PublicStatusEnabled;
  language: string;
  notice: TalkerNotice;
  isStarting: boolean;
  onLanguageChange: (language: string) => void;
  onStart: (input: { displayName: string; language: string }) => void;
}

/** "हिन्दी", "தமிழ்" — each language named in itself, so a talker can find theirs. */
export const languageName = (code: string): string => {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
    if (name && name !== code) return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch {
    // Fall through to the code.
  }
  return code.toUpperCase();
};

const Section: FC<{ title: string; children: React.ReactNode; testId?: string }> = ({
  title,
  children,
  testId,
}) => (
  <section data-testid={testId}>
    <h2 className="font-primary text-base font-medium text-typography-900">{title}</h2>
    <div className="mt-1 font-primary text-base text-typography-800">{children}</div>
  </section>
);

/**
 * The consent screen, in the contract's order (§7): what this is → not an
 * emergency service (numbers right here) → AI assistance → confidentiality and
 * its limits → retention → shared-device privacy → the org's age notice.
 * Limits of confidentiality come before the talker can disclose anything —
 * there is no message field on this screen at all ("Timing and Balance in
 * Informed Consent"). Each point is a heading and a line or two, so it can be
 * scanned on a phone rather than skipped.
 */
export const ConsentScreen: FC<ConsentScreenProps> = ({
  status,
  language,
  notice,
  isStarting,
  onLanguageChange,
  onStart,
}) => {
  const { t } = useTranslation();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const [displayName, setDisplayName] = useState("");
  const nameId = useId();
  const nameHintId = useId();
  const org = status.org.name;
  const retentionDays = status.consent.retentionDays;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (isStarting) return;
    onStart({ displayName, language });
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-6">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-secondary text-2xl text-typography-900 focus:outline-none"
      >
        {t("helplineTalker.consent.title", { org })}
      </h1>
      <p className="mt-2 font-primary text-base text-typography-800">
        {t("helplineTalker.consent.intro", { org })}
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Section title={t("helplineTalker.consent.notEmergencyTitle")} testId="consent-emergency">
          <p>{t("helplineTalker.consent.notEmergencyBody")}</p>
          <ResourcesCard className="mt-2" text={resourcesFor(status.resources, language)} />
        </Section>

        <Section title={t("helplineTalker.consent.aiTitle")} testId="consent-ai">
          <p>{t("helplineTalker.consent.aiBody")}</p>
        </Section>

        <Section title={t("helplineTalker.consent.privacyTitle")} testId="consent-privacy">
          <p>{t("helplineTalker.consent.privacyBody", { org })}</p>
        </Section>

        <Section title={t("helplineTalker.consent.retentionTitle")} testId="consent-retention">
          <p>
            {retentionDays > 0
              ? t("helplineTalker.consent.retentionBody", { count: retentionDays })
              : t("helplineTalker.consent.retentionForever")}
          </p>
        </Section>

        <Section title={t("helplineTalker.consent.deviceTitle")} testId="consent-device">
          <p>{t("helplineTalker.consent.deviceBody")}</p>
        </Section>

        {status.consent.ageNotice?.trim() && (
          <Section title={t("helplineTalker.consent.ageNoticeTitle")} testId="consent-age">
            <p className="whitespace-pre-line">{status.consent.ageNotice}</p>
          </Section>
        )}
      </div>

      <form
        onSubmit={submit}
        className="mt-8 flex flex-col gap-5 rounded-2xl border border-border-light bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor={nameId}
            className="font-primary text-base font-medium text-typography-900"
          >
            {t("helplineTalker.consent.nameLabel")}
          </label>
          <input
            id={nameId}
            type="text"
            value={displayName}
            maxLength={HELPLINE_LIMITS.DISPLAY_NAME_MAX}
            autoComplete="off"
            aria-describedby={nameHintId}
            placeholder={t("helplineTalker.consent.namePlaceholder")}
            onChange={event => setDisplayName(event.target.value)}
            className="min-h-[44px] rounded-xl border border-border-medium bg-white px-4 font-primary text-base text-typography-900 placeholder:text-typography-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          />
          <p id={nameHintId} className="font-primary text-sm text-typography-700">
            {t("helplineTalker.consent.nameHint")}
          </p>
        </div>

        {status.languages.length > 1 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="font-primary text-base font-medium text-typography-900">
              {t("helplineTalker.consent.languageLabel")}
            </legend>
            <div className="flex flex-wrap gap-2">
              {status.languages.map(code => (
                <label
                  key={code}
                  className={`inline-flex min-h-[44px] cursor-pointer items-center rounded-full border px-4 font-primary text-base focus-within:ring-2 focus-within:ring-primary-500 ${
                    code === language
                      ? "border-primary-500 bg-primary-50 text-typography-900"
                      : "border-border-medium bg-white text-typography-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="helpline-language"
                    value={code}
                    checked={code === language}
                    onChange={() => onLanguageChange(code)}
                    className="sr-only"
                  />
                  <span lang={code}>{languageName(code)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {notice && (
          <p
            role={notice === "sessionExpired" ? "status" : "alert"}
            className={`rounded-xl px-4 py-3 font-primary text-base ${
              notice === "sessionExpired"
                ? "bg-background-secondary text-typography-900"
                : "bg-destructive-50 text-destructive-800"
            }`}
          >
            {t(`helplineTalker.consent.notice.${notice}`)}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <TalkerButton type="submit" fullWidth disabled={isStarting}>
            {isStarting ? t("helplineTalker.consent.starting") : t("helplineTalker.consent.start")}
          </TalkerButton>
          <p className="text-center font-primary text-sm text-typography-700">
            {t("helplineTalker.consent.agreement")}
          </p>
        </div>
      </form>
    </div>
  );
};
