import { FunctionComponent, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ActionableNotification, Loading } from "@ally-ui-mono/ui-shared";
import { useGetLearnerScenarioAttemptsQuery, useResetBranchingAttemptsMutation } from "@api";
import { Button, ButtonVariant, Drawer } from "@components";
import { ANALYTICS_EVENTS, ANALYTICS_PROPS } from "@constants/analyticsEvents";
import { useAnalytics } from "@hooks";
import { LearnerScenarioAttempt } from "@types";

interface ScenarioAttemptsDrawerProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  learnerName: string;
}

const formatDateTime = (value: string | null): string =>
  value ? new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "";

/**
 * Trainer view of one learner's unfinished scenario quizzes, with the action
 * that reopens their attempts. The list is only scenarios the learner started
 * and has not passed, so every row here is a valid reopen target. Reopening is
 * confirmed in place (it is immediate and cannot be undone) rather than in a
 * second modal stacked on the drawer.
 */
export const ScenarioAttemptsDrawer: FunctionComponent<ScenarioAttemptsDrawerProps> = ({
  open,
  onClose,
  userId,
  learnerName,
}) => {
  const { t } = useTranslation();
  const { track } = useAnalytics();
  const [confirming, setConfirming] = useState<LearnerScenarioAttempt | null>(null);

  // `skip` while closed: the table has one drawer per row set, and a request per
  // learner nobody opened would be wasted. Tag invalidation refetches this
  // entry after a reset.
  const { data, isLoading, isError, refetch } = useGetLearnerScenarioAttemptsQuery(userId, {
    skip: !open,
  });
  const [resetAttempts, { isLoading: isResetting }] = useResetBranchingAttemptsMutation();

  const groups = useMemo(() => {
    const byTrack = new Map<string, { trackTitle: string; items: LearnerScenarioAttempt[] }>();
    (data ?? []).forEach(item => {
      const group = byTrack.get(item.trackId) ?? { trackTitle: item.trackTitle, items: [] };
      group.items.push(item);
      byTrack.set(item.trackId, group);
    });
    return Array.from(byTrack.entries());
  }, [data]);

  const handleClose = () => {
    setConfirming(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!confirming) return;
    try {
      await resetAttempts({ trackItemId: confirming.trackItemId, userId }).unwrap();
      track(ANALYTICS_EVENTS.LEARNER_SCENARIO_ATTEMPTS_REOPENED, {
        [ANALYTICS_PROPS.LEARNER_ID]: userId,
        [ANALYTICS_PROPS.LEARNER_NAME]: learnerName,
        [ANALYTICS_PROPS.TRACK_ITEM_ID]: confirming.trackItemId,
      });
      toast.success(t("organizationMetrics.scenarioAttempts.reopenSuccess"));
      setConfirming(null);
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message;
      toast.error(message || t("organizationMetrics.scenarioAttempts.reopenError"));
    }
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12" data-testid="scenario-attempts-loading">
          <Loading withOverlay={false} />
        </div>
      );
    }
    if (isError) {
      return (
        <ActionableNotification
          kind="error"
          lowContrast
          hideCloseButton
          inline
          title={t("organizationMetrics.scenarioAttempts.errorTitle")}
          subtitle={t("organizationMetrics.scenarioAttempts.errorSubtitle")}
          actionButtonLabel={t("organizationMetrics.states.retry")}
          onActionButtonClick={() => refetch()}
        />
      );
    }
    if (groups.length === 0) {
      return (
        <p className="text-sm text-typography-600" data-testid="scenario-attempts-empty">
          {t("organizationMetrics.scenarioAttempts.empty")}
        </p>
      );
    }
    return (
      <div className="flex flex-col gap-6">
        {groups.map(([trackId, group]) => (
          <section key={trackId} data-testid="scenario-attempts-group">
            <h4 className="text-sm font-medium text-typography-900 mb-2">{group.trackTitle}</h4>
            <ul className="flex flex-col gap-3">
              {group.items.map(item => (
                <li
                  key={item.trackItemId}
                  className="border border-solid border-[#e0ddd2] rounded p-3 flex flex-col gap-2"
                  data-testid="scenario-attempts-row"
                >
                  <div className="text-sm font-medium text-typography-800">{item.title}</div>
                  <div className="text-sm text-typography-600">
                    {item.maxAttempts == null
                      ? t("organizationMetrics.scenarioAttempts.attemptsUncapped", {
                          used: item.attemptsUsed,
                        })
                      : t("organizationMetrics.scenarioAttempts.attemptsUsed", {
                          used: item.attemptsUsed,
                          max: item.maxAttempts,
                        })}
                    {item.bestScore != null &&
                      ` · ${t("organizationMetrics.scenarioAttempts.bestScore", {
                        score: item.bestScore,
                      })}`}
                  </div>
                  <div className="text-sm text-typography-800">
                    {item.exhausted
                      ? t("organizationMetrics.scenarioAttempts.pausedUntil", {
                          when: formatDateTime(item.nextRoundAt),
                        })
                      : t("organizationMetrics.scenarioAttempts.inProgress")}
                  </div>
                  {confirming?.trackItemId === item.trackItemId ? (
                    <div className="flex flex-col gap-2" data-testid="scenario-attempts-confirm">
                      <p className="text-sm text-typography-800">
                        {t("organizationMetrics.scenarioAttempts.confirm", {
                          name: learnerName,
                          scenario: item.title,
                        })}
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={handleConfirm} disabled={isResetting}>
                          {t("organizationMetrics.scenarioAttempts.confirmButton")}
                        </Button>
                        <Button
                          variant={ButtonVariant.SECONDARY}
                          onClick={() => setConfirming(null)}
                          disabled={isResetting}
                        >
                          {t("organizationMetrics.scenarioAttempts.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Button variant={ButtonVariant.SECONDARY} onClick={() => setConfirming(item)}>
                        {t("organizationMetrics.scenarioAttempts.reopen")}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  };

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={t("organizationMetrics.scenarioAttempts.title", { name: learnerName })}
      drawerClassName="w-[40vw] min-w-[400px]"
      bodyClassName="p-4"
    >
      {renderBody()}
    </Drawer>
  );
};

export default ScenarioAttemptsDrawer;
