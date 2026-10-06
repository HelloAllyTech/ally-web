import { FC, ReactNode } from "react";

import { useTranslation } from "react-i18next";

/** A count with its label — no chart: one number is the whole message. */
export const StatTile: FC<{
  label: string;
  value: number;
  /** Status styling (icon + label carry it too, never colour alone). */
  tone?: "neutral" | "alarm";
  icon?: ReactNode;
  testId?: string;
}> = ({ label, value, tone = "neutral", icon, testId }) => (
  <div
    className={`flex flex-col gap-1 rounded-xl border p-3 font-primary ${
      tone === "alarm"
        ? "border-status-alarmDot bg-status-alarmBg text-status-alarmFg"
        : "border-border-light bg-white text-typography-900"
    }`}
    data-testid={testId}
  >
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      {icon}
      {label}
    </span>
    <span className="text-2xl font-semibold tabular-nums">{value}</span>
  </div>
);

/** Connected / Disconnected with a dot — the word carries it, the dot only echoes. */
export const ConnectionCell: FC<{ connected: boolean }> = ({ connected }) => {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={`h-2 w-2 flex-shrink-0 rounded-full ${connected ? "bg-status-sageDot" : "bg-status-alarmDot"}`}
      />
      {connected ? t("helplineWorkspace.info.connected") : t("helplineWorkspace.info.disconnected")}
    </span>
  );
};

export const tableClass = "w-full border-collapse font-primary text-sm";
export const theadClass = "bg-background-secondary text-left text-xs text-typography-700";
export const thClass = "px-3 py-2 font-medium";
export const tdClass = "px-3 py-2 align-top";

/** A titled block on the Monitor / QA pages. */
export const PageSection: FC<{
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}> = ({ id, title, aside, children }) => (
  <section aria-labelledby={id} className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="font-primary text-lg font-medium text-typography-900">
        {title}
      </h2>
      {aside}
    </div>
    {children}
  </section>
);

export const EmptyBox: FC<{ children: ReactNode; testId?: string }> = ({ children, testId }) => (
  <p
    className="rounded-xl border border-dashed border-border-medium p-4 text-center font-primary text-sm text-typography-700"
    data-testid={testId}
  >
    {children}
  </p>
);

export const LoadFailed: FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex items-center gap-3 font-primary text-sm text-typography-800">
      {message}
      <button
        type="button"
        onClick={onRetry}
        className="rounded-full border border-border-medium px-3 py-1 hover:bg-background-secondary"
      >
        {t("helplineWorkspace.gate.retry")}
      </button>
    </div>
  );
};
