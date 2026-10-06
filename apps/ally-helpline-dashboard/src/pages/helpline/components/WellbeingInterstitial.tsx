import { FC, useEffect, useRef } from "react";

import { useTranslation } from "react-i18next";

interface WellbeingInterstitialProps {
  supportContact: string | null;
  onContinue: () => void;
}

/**
 * Shown after a chat that reached HIGH risk, before the next one: let the
 * listener process what happened before moving on ("Sequencing Crisis
 * Supervision: Processing Before Problem-Solving"). One screen, no metrics,
 * one way forward.
 */
export const WellbeingInterstitial: FC<WellbeingInterstitialProps> = ({
  supportContact,
  onContinue,
}) => {
  const { t } = useTranslation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      className="flex h-full items-center justify-center bg-background-secondary p-6"
      data-testid="wellbeing-interstitial"
    >
      <div className="max-w-md rounded-2xl bg-white p-8 text-center font-primary shadow-sm">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-secondary text-3xl text-typography-900 focus:outline-none"
        >
          {t("helplineWorkspace.wellbeing.title")}
        </h1>
        <p className="mt-3 text-base text-typography-800">
          {t("helplineWorkspace.wellbeing.body")}
        </p>
        {supportContact?.trim() && (
          <p className="mt-3 whitespace-pre-line break-words text-base text-typography-900">
            {t("helplineWorkspace.wellbeing.support", { contact: supportContact })}
          </p>
        )}
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 min-h-[44px] rounded-full bg-primary-500 px-6 text-base font-medium text-white hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          {t("helplineWorkspace.wellbeing.back")}
        </button>
      </div>
    </div>
  );
};
