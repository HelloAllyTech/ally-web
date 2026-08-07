import { FC, useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { DropdownField, MaxActiveUsersDialog } from "@ally-ui-mono/ui-shared";
import {
  useEndSimulationMutation,
  useGetReviewsQuery,
  useGetScenarioQuery,
  useGetScenariosQuery,
} from "@api";
import { BackCircle, ExistingCall, PageNotFoundIllustration, PlayIcon } from "@assets";
import {
  AppTooltip,
  LoginDialog,
  ScenarioDetailsCard,
  ConfirmationDialog,
  ButtonVariant,
  FallbackUI,
  CreditInfo,
} from "@components";
import {
  AUTO_CLOSE_DIALOG_DURATION,
  LOCAL_STORAGE_KEYS,
  Permissions,
  ROUTES,
  TooltipLocation,
} from "@constants";
import { useSimulationCredits, useStartSimulation, useUser } from "@hooks";
import { LanguageOption } from "@types";
import { hasPermissions } from "@utils";

import i18n from "../../i18n";
import { learnPageExpandedVariants } from "../learn/constants";
import PeerSessionsDrawer from "./components/PeerSessionsDrawer";

export const Scenario: FC = () => {
  const { t } = useTranslation();
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const { credits, limitReached, refetchCredits } = useSimulationCredits();
  const { permissions } = useUser();

  const id = Number(scenarioId);

  // Peer "shared for review" sessions are visible on the case card only to
  // users who are both a reviewer (can read the tenant-wide review feed) and a
  // learner (actually play scenarios). Reviewers already have read access to
  // every IN_REVIEW review in their tenant, so no new authorization is needed.
  const canSeeSharedReviews =
    hasPermissions(permissions, Permissions.EDIT_SCENARIO_SESSION) &&
    hasPermissions(permissions, Permissions.VIEW_SIMULATION_REVIEWS);

  const isAuthenticated = () => Boolean(localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN));

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState<boolean>(false);
  const [isExistingSimulationConfirmOpen, setIsExistingSimulationConfirmOpen] =
    useState<boolean>(false);
  const [noCreditsLeft, setNoCreditsLeft] = useState<boolean>(false);
  const [notEnoughCredits, setNoEnoughCredits] = useState<boolean>(false);
  const [buttonDisable, setButtonDisable] = useState<boolean>(false);
  const [isMaxActiveUsersPopupOpen, setIsMaxActiveUsersPopupOpen] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption | null>(null);
  const [isPeerDrawerOpen, setIsPeerDrawerOpen] = useState<boolean>(false);

  const {
    data: scenario,
    isSuccess: isScenarioSuccess,
    isLoading: isScenarioLoading,
  } = useGetScenarioQuery({
    scenarioId: id,
    isPrivate: isAuthenticated(),
    languageCode: i18n.language,
  });

  // Read availableLanguages from the already-cached scenarios list (v2 endpoint returns it)
  const { availableLanguages } = useGetScenariosQuery(
    { isPrivate: isAuthenticated(), languageCode: i18n.language },
    {
      selectFromResult: ({ data }) => ({
        availableLanguages: data?.data?.find(s => s.id === id)?.availableLanguages ?? [],
      }),
    },
  );
  // Cheap count-only probe: decides whether to surface the "watch peers" entry
  // point. The drawer fetches the full list on open. Tenant + IN_REVIEW filtering
  // is applied server-side, so this only counts shared sessions for this scenario.
  const { peerSessionCount } = useGetReviewsQuery(
    { scenarioId: id, limit: 1, offset: 0, excludeOwn: true },
    {
      skip: !canSeeSharedReviews || !id,
      selectFromResult: ({ data }) => ({ peerSessionCount: data?.count ?? 0 }),
    },
  );

  const [endSimulation] = useEndSimulationMutation();

  const [startSimulationError, setStartSimulationError] = useState<unknown>(null);
  const { startSimulation, isStarting: isStartingSimulation } = useStartSimulation({
    onSuccess: () => {
      setIsLoginDialogOpen(false);
    },
    onError: error => {
      setStartSimulationError(error);
      const errorData = error as { data?: { statusCode?: number; entityId?: string } };
      if (errorData.data?.statusCode === 400 && errorData?.data?.entityId) {
        setIsExistingSimulationConfirmOpen(true);
      } else if (errorData.data?.statusCode === 429) {
        setIsMaxActiveUsersPopupOpen(true);
      }
    },
  });

  useEffect(() => {
    if (!credits) return;

    if (credits?.consumedCredits === credits?.creditLimit) {
      setNoCreditsLeft(true);
      return;
    }
    if (limitReached) setNoEnoughCredits(true);
  }, [credits]);

  // Default the picker to the first available language, but ONLY when there is no
  // valid selection yet. `availableLanguages` is a fresh array on every render
  // (selectFromResult's `?? []` fallback above), so this effect re-fires on any
  // refetch/cache invalidation. Resetting unconditionally clobbered a learner's
  // choice back to availableLanguages[0] — English for nearly every simulation —
  // and the session then started in English despite the dropdown showing Hindi.
  // Matched on `label` to stay consistent with handleLanguageChange and the
  // dropdown's `value`; `language_id` is optional on LanguageOption, so comparing
  // it would treat two undefineds as a match.
  useEffect(() => {
    if (!availableLanguages?.length) return;
    const isSelectionStillOffered =
      selectedLanguage != null &&
      availableLanguages.some(lang => lang.label === selectedLanguage.label);
    if (!isSelectionStillOffered) {
      setSelectedLanguage(availableLanguages[0]);
    }
  }, [availableLanguages, selectedLanguage]);

  const handleLanguageChange = (label: string) => {
    const selected = availableLanguages?.find(lang => lang.label === label) || null;
    setSelectedLanguage(selected);
  };

  const renderBackButton = () => {
    return (
      <AppTooltip location={TooltipLocation.SCENARIO_BACK_BUTTON}>
        <motion.button
          data-testid="scenario-back-button"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          onClick={() => navigate(ROUTES.LEARN)}
          className="hover:scale-105 transition-transform"
          aria-label={t("learn.scenario.backAria")}
        >
          <BackCircle />
        </motion.button>
      </AppTooltip>
    );
  };

  const handleStartSimulation = async () => {
    await startSimulation({
      params: {
        scenarioId: id,
        languageId: selectedLanguage?.language_id,
      },
      metadata: {
        title: scenario?.title,
        coverImageUrl: scenario?.coverImageUrl,
      },
    });
  };

  const onStartSimulationClick = () => {
    // TODO: update authorization check
    if (!isAuthenticated()) {
      // TODO: Retest login through dialog
      setIsLoginDialogOpen(true);
      return;
    } else {
      handleStartSimulation();
    }
  };

  const endExistingSimulation = async () => {
    if (
      startSimulationError &&
      typeof startSimulationError === "object" &&
      "data" in startSimulationError
    ) {
      const errorData = startSimulationError.data as { entityId?: string };
      if (errorData.entityId) {
        await endSimulation({ sessionId: errorData.entityId });
        toast.success(t("common.simulationEndedSuccess"));
        setIsExistingSimulationConfirmOpen(false);
        refetchCredits();
        return;
      }
    }
    toast.error(t("common.somethingWentWrong"));
    setIsExistingSimulationConfirmOpen(false);
  };

  const onSecondaryButtonClick = () => {
    setIsExistingSimulationConfirmOpen(false);
  };

  const handleCreditClose = (type: string) => {
    if (type === "noCredits") {
      setNoCreditsLeft(false);
    } else if (type === "notEnough") {
      setNoEnoughCredits(false);
    }
    setButtonDisable(true);
  };

  const handleMaxActiveUsersRetry = () => {
    setIsMaxActiveUsersPopupOpen(false);
    handleStartSimulation();
  };
  // TODO: Add loading fallback UI for scenario

  return (
    <AnimatePresence mode="wait">
      <div className="h-full w-full flex flex-col bg-white" data-testid="scenario-page">
        {scenario && isScenarioSuccess ? (
          <>
            {isAuthenticated() && (
              <div
                className="flex items-center gap-2 font-secondary text-3xl text-typography-900 px-6 pt-6 shrink-0"
                data-testid="scenario-title"
              >
                {renderBackButton()}
                <span>{t("learn.scenario.pageTitlePrefix")}</span>
                <span className="font-bold italic"> {t("learn.scenario.pageTitleEmphasis")}</span>
              </div>
            )}
            <motion.div
              data-testid="scenario-content"
              variants={learnPageExpandedVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-1 min-h-0 flex-col justify-start gap-6 w-full max-w-[600px] mx-auto px-4 overflow-y-auto py-4"
            >
              {/* Language dropdown — shown when scenario has languages from the API */}
              {(availableLanguages?.length ?? 0) > 0 && (
                <div className="w-full sm:w-48 self-start">
                  <div className="relative w-48">
                    <DropdownField
                      data-testid="language-dropdown"
                      options={availableLanguages.map(lang => lang.label)}
                      value={selectedLanguage?.label || ""}
                      onChange={handleLanguageChange}
                      valueClassName="text-typography-900 font-primary"
                    />
                  </div>
                </div>
              )}
              {/* flex-1 min-h-0 gives the card the remaining space in this
                  column (after the dropdown above it) as a real bound, so the
                  card's own header/scroll/footer split has something definite
                  to divide up instead of just sizing to its content. */}
              <div className="min-h-0 w-full flex-1">
                <ScenarioDetailsCard
                  data-testid="scenario-details-card"
                  coverImage={scenario?.coverImageUrl || ""}
                  coverVideo={scenario?.coverVideoUrl || ""}
                  difficultyLevel={scenario?.difficultyLevel}
                  isStarting={isStartingSimulation}
                  title={scenario?.title || ""}
                  longDescription={scenario?.description || ""}
                  maxTimeValue={scenario?.maxTimeValue}
                  onStart={onStartSimulationClick}
                  noCredits={buttonDisable}
                  triggerWarnings={scenario?.triggerWarnings}
                />
              </div>
              {canSeeSharedReviews && peerSessionCount > 0 && (
                <button
                  type="button"
                  data-testid="watch-peer-sessions-button"
                  onClick={() => setIsPeerDrawerOpen(true)}
                  className="flex w-full max-w-[600px] items-center justify-center gap-2 rounded-lg border border-primary-500 py-3 font-tertiary text-base text-primary-500 transition-colors hover:bg-primary-50"
                >
                  <PlayIcon className="h-5 w-5" />
                  <span>
                    {t("learn.scenario.peerSessions.button", "Watch how peers handled this")} (
                    {peerSessionCount})
                  </span>
                </button>
              )}
              {canSeeSharedReviews && isPeerDrawerOpen && (
                <PeerSessionsDrawer scenarioId={id} onClose={() => setIsPeerDrawerOpen(false)} />
              )}
              <LoginDialog
                data-testid="scenario-login-dialog"
                isOpen={isLoginDialogOpen}
                onClose={() => setIsLoginDialogOpen(false)}
                onSuccess={handleStartSimulation}
              />
              <ConfirmationDialog
                data-testid="scenario-existing-simulation-dialog"
                title={{
                  normal: t("learn.scenario.existing.titleNormal"),
                  italic: t("learn.scenario.existing.titleItalic"),
                }}
                isOpen={isExistingSimulationConfirmOpen}
                onClose={() => setIsExistingSimulationConfirmOpen(false)}
                content={t("learn.scenario.existing.content")}
                buttonVariant={ButtonVariant.PRIMARY}
                onButtonClick={endExistingSimulation}
                buttonText={t("learn.scenario.existing.primary")}
                secondaryButtonText={t("common.cancel")}
                onSecondaryButtonClick={onSecondaryButtonClick}
                icon={ExistingCall}
              />
              <CreditInfo
                data-testid="scenario-no-credits-dialog"
                open={noCreditsLeft}
                onClose={() => handleCreditClose("noCredits")}
                title={t("learn.scenario.noCredits.title")}
                description={t("learn.scenario.noCredits.desc")}
                autoCloseDuration={AUTO_CLOSE_DIALOG_DURATION}
              />
              <CreditInfo
                data-testid="scenario-not-enough-credits-dialog"
                open={notEnoughCredits}
                onClose={() => handleCreditClose("notEnough")}
                title={t("learn.scenario.notEnough.title")}
                description={t("learn.scenario.notEnough.desc")}
                autoCloseDuration={AUTO_CLOSE_DIALOG_DURATION}
              />
              <MaxActiveUsersDialog
                open={isMaxActiveUsersPopupOpen}
                onClose={() => setIsMaxActiveUsersPopupOpen(false)}
                onRetry={handleMaxActiveUsersRetry}
                translations={{
                  title: t("common.maxActiveUsers.title"),
                  description: t("common.maxActiveUsers.description"),
                  retry: t("common.maxActiveUsers.retry"),
                  manualRetry: t("common.maxActiveUsers.manualRetry"),
                  autoRetry: t("common.maxActiveUsers.autoRetry"),
                }}
              />
            </motion.div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <FallbackUI
              data-testid="scenario-not-found"
              icon={<PageNotFoundIllustration />}
              isLoading={isScenarioLoading}
              mainMessage={t("learn.scenario.notFound.title")}
              description={t("learn.scenario.notFound.desc")}
            />
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
