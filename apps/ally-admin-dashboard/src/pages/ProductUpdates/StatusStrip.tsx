import { FC } from "react";

import { toast } from "sonner";

import { ProductUpdatesStatus, useRunProductUpdatesMutation } from "@api";
import { Button } from "@components";
import { ButtonVariant } from "@components/types";
import { en } from "@constants";
import { formatDateTime } from "@utils";

interface StatusStripProps {
  status: ProductUpdatesStatus | undefined;
  running: boolean;
  isError: boolean;
}

const Stat: FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-0.5 min-w-[120px]">
    <span className="text-xs text-typography-700">{label}</span>
    <span className="text-sm text-typography-900">{children}</span>
  </div>
);

const lastRunOutcome = (status: ProductUpdatesStatus) => {
  const t = en.productUpdates;
  const run = status.lastRun;
  if (!run) return null;
  if (run.error) return { text: t.status.runFailed, tone: "text-destructive-500" };
  if (run.degraded) return { text: t.status.runDegraded, tone: "text-typography-900" };
  return { text: t.status.runOk, tone: "text-typography-900" };
};

/** Automation health at a glance, plus the "Run now" trigger. */
export const StatusStrip: FC<StatusStripProps> = ({ status, running, isError }) => {
  const t = en.productUpdates;
  const [runNow, { isLoading: isStarting }] = useRunProductUpdatesMutation();

  const handleRun = async () => {
    const result = await runNow();
    if ("error" in result && result.error) {
      toast.error(t.toasts.runFailed);
      return;
    }
    if (result.data?.started) {
      toast.success(t.toasts.runStarted);
    } else {
      toast.info(result.data?.reason ?? t.toasts.runNotStarted);
    }
  };

  if (isError && !status) {
    return <p className="mt-4 text-sm text-destructive-500">{t.status.loadFailed}</p>;
  }

  const outcome = status ? lastRunOutcome(status) : null;
  const lastRun = status?.lastRun ?? null;

  return (
    <div
      className="flex flex-wrap items-end gap-x-6 md:gap-x-8 gap-y-3 mt-4 md:mt-6 p-4 border border-border-light bg-background-secondary"
      data-testid="product-updates-status"
    >
      <Stat label={t.status.schedule}>
        {status ? (status.enabled ? t.status.scheduleOn : t.status.scheduleOff) : "—"}
      </Stat>
      <Stat label={t.status.lastRun}>
        {running ? (
          t.status.running
        ) : lastRun ? (
          <>
            {formatDateTime(lastRun.finishedAt ?? lastRun.startedAt)}
            {outcome && <span className={`ml-2 ${outcome.tone}`}>{outcome.text}</span>}
          </>
        ) : status ? (
          t.status.neverRun
        ) : (
          "—"
        )}
      </Stat>
      <Stat label={t.status.inProgress}>
        {status ? status.sources.pending + status.sources.enriched : "—"}
      </Stat>
      <Stat label={t.status.publicUpdates}>{status ? status.updates.public : "—"}</Stat>
      <Stat label={t.status.waitingUpdates}>{status ? status.updates.waiting : "—"}</Stat>
      <div className="ml-auto">
        <Button
          variant={ButtonVariant.SECONDARY}
          onClick={handleRun}
          disabled={running || isStarting || !status}
        >
          {running ? t.status.running : t.status.runNow}
        </Button>
      </div>
      {lastRun?.error && (
        <p className="basis-full text-sm text-destructive-500 break-words">{lastRun.error}</p>
      )}
    </div>
  );
};
