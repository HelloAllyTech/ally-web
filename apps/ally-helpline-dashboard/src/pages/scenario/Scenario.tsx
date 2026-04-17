import { FC, useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { MaxActiveUsersDialog } from "@ally-ui-mono/ui-shared";
import { useEndSimulationMutation, useGetScenarioQuery } from "@api";
import { BackCircle, ExistingCall, PageNotFoundIllustration } from "@assets";
import {
  LoginDialog,
  ScenarioDetailsCard,
  ConfirmationDialog,
  ButtonVariant,
  FallbackUI,
  CreditInfo,
  CreditsDisplay,
} from "@components";
import { AUTO_CLOSE_DIALOG_DURATION, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { useSimulationCredits, useStartSimulation } from "@hooks";

import i18n from "../../i18n";
import { learnPageExpandedVariants } from "../learn/constants";

export const Scenario: FC = () => {
  const { t } = useTranslation();
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const { credits, limitReached, refetchCredits } = useSimulationCredits();

  const id = Number(scenarioId);

  const isAuthenticated = () => Boolean(localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN));

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState<boolean>(false);
  const [isExistingSimulationConfirmOpen, setIsExistingSimulationConfirmOpen] =
    useState<boolean>(false);
  const [noCreditsLeft, setNoCreditsLeft] = useState<boolean>(false);
  const [notEnoughCredits, setNoEnoughCredits] = useState<boolean>(false);
  const [buttonDisable, setButtonDisable] = useState<boolean>(false);
  const [isMaxActiveUsersPopupOpen, setIsMaxActiveUsersPopupOpen] = useState<boolean>(false);

  const {
    data: scenario,
    isSuccess: isScenarioSuccess,
    isLoading: isScenarioLoading,
  } = useGetScenarioQuery({
    scenarioId: id,
    isPrivate: isAuthenticated(),
    languageCode: i18n.language,
  });
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

  const renderBackButton = () => {
    return (
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
    );
  };

  const handleStartSimulation = async () => {
    await startSimulation({
      params: {
        scenarioId: id,
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
      <div
        className="h-screen w-full flex justify-center items-center bg-white"
        data-testid="scenario-page"
      >
        {scenario && isScenarioSuccess ? (
          <motion.div
            data-testid="scenario-content"
            variants={learnPageExpandedVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col gap-6 w-full max-w-[600px] m-auto px-4"
          >
            {isAuthenticated() && (
              <div
                className="flex justify-between w-full max-w-[600px]"
                data-testid="scenario-header"
              >
                <div
                  className="flex items-center gap-2 font-secondary text-3xl"
                  data-testid="scenario-title"
                >
                  {renderBackButton()}
                  <span>{t("learn.scenario.pageTitlePrefix")}</span>
                  <span className="font-bold italic"> {t("learn.scenario.pageTitleEmphasis")}</span>
                </div>
                <CreditsDisplay />
              </div>
            )}
            <ScenarioDetailsCard
              data-testid="scenario-details-card"
              coverImage={scenario?.coverImageUrl || ""}
              coverVideo={scenario?.coverVideoUrl || ""}
              isStarting={isStartingSimulation}
              title={scenario?.title || ""}
              longDescription={scenario?.description || ""}
              onStart={onStartSimulationClick}
              noCredits={buttonDisable}
              triggerWarnings={scenario?.triggerWarnings}
            />
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
        ) : (
          <FallbackUI
            data-testid="scenario-not-found"
            icon={<PageNotFoundIllustration />}
            isLoading={isScenarioLoading}
            mainMessage={t("learn.scenario.notFound.title")}
            description={t("learn.scenario.notFound.desc")}
          />
        )}
      </div>
    </AnimatePresence>
  );
};
