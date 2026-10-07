import { FC, ReactNode } from "react";

import { useTranslation } from "react-i18next";

import type { HelplineClosedReason, HelplineHours } from "@types";

import { HoursList } from "./HoursList";
import { ResourcesCard } from "./ResourcesCard";
import { TalkerButton } from "./TalkerButton";
import { useFocusOnMount } from "./useFocusOnMount";

const ScreenFrame: FC<{ title: string; children?: ReactNode; testId: string }> = ({
  title,
  children,
  testId,
}) => {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  return (
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-10 pt-8"
      data-testid={testId}
    >
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-secondary text-2xl text-typography-900 focus:outline-none"
      >
        {title}
      </h1>
      {children}
    </div>
  );
};

export const LoadingScreen: FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 items-center justify-center p-8" role="status" aria-live="polite">
      <span className="font-primary text-base text-typography-700">
        {t("helplineTalker.loading")}
      </span>
    </div>
  );
};

interface ClosedScreenProps {
  reason: HelplineClosedReason | null;
  hours: HelplineHours | null;
  resourcesText: string | null;
  isChecking: boolean;
  onTryAgain: () => void;
}

/** Nobody available, outside hours, or the queue is full — never a dead end: resources + Try again. */
export const ClosedScreen: FC<ClosedScreenProps> = ({
  reason,
  hours,
  resourcesText,
  isChecking,
  onTryAgain,
}) => {
  const { t } = useTranslation();
  const isBusy = reason === "QUEUE_FULL";
  return (
    <ScreenFrame
      testId="talker-closed"
      title={isBusy ? t("helplineTalker.closed.busyTitle") : t("helplineTalker.closed.title")}
    >
      <p className="font-primary text-base text-typography-800">
        {isBusy
          ? t("helplineTalker.closed.busyBody")
          : reason === "OUTSIDE_HOURS"
            ? t("helplineTalker.closed.outsideHoursBody")
            : t("helplineTalker.closed.body")}
      </p>
      {!isBusy && hours && hours.weekly.length > 0 && <HoursList hours={hours} />}
      <ResourcesCard text={resourcesText} />
      <TalkerButton
        onClick={onTryAgain}
        disabled={isChecking}
        className="self-stretch sm:self-start"
      >
        {isChecking ? t("helplineTalker.closed.checking") : t("helplineTalker.closed.tryAgain")}
      </TalkerButton>
    </ScreenFrame>
  );
};

/** Unknown code or a disabled helpline: the server won't say which, and neither do we. */
export const NotAvailableScreen: FC = () => {
  const { t } = useTranslation();
  return (
    <ScreenFrame testId="talker-not-available" title={t("helplineTalker.notAvailable.title")}>
      <p className="font-primary text-base text-typography-800">
        {t("helplineTalker.notAvailable.body")}
      </p>
      <ResourcesCard />
    </ScreenFrame>
  );
};

export const DeletedScreen: FC<{ resourcesText: string | null; onStartNew: () => void }> = ({
  resourcesText,
  onStartNew,
}) => {
  const { t } = useTranslation();
  return (
    <ScreenFrame testId="talker-deleted" title={t("helplineTalker.delete.doneTitle")}>
      <p className="font-primary text-base text-typography-800">
        {t("helplineTalker.delete.doneBody")}
      </p>
      <ResourcesCard text={resourcesText} />
      <TalkerButton variant="secondary" className="self-stretch sm:self-start" onClick={onStartNew}>
        {t("helplineTalker.ended.startNew")}
      </TalkerButton>
    </ScreenFrame>
  );
};

export const ErrorScreen: FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const { t } = useTranslation();
  return (
    <ScreenFrame testId="talker-error" title={t("helplineTalker.error.title")}>
      <p className="font-primary text-base text-typography-800">{t("helplineTalker.error.body")}</p>
      <ResourcesCard />
      <TalkerButton className="self-stretch sm:self-start" onClick={onRetry}>
        {t("helplineTalker.error.retry")}
      </TalkerButton>
    </ScreenFrame>
  );
};
