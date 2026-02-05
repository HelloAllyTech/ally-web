import { FC, useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { DropdownField, FEATURE_FLAGS_MAP } from "@ally-ui-mono/ui-shared";
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
  MaxActiveUsersDialog,
} from "@components";
import { AUTO_CLOSE_DIALOG_DURATION, LOCAL_STORAGE_KEYS, ROUTES } from "@constants";
import { useSimulationCredits, useStartSimulation } from "@hooks";
import { LanguageOption } from "@types";

import { learnPageExpandedVariants } from "../learn/constants";

export const Scenario: FC = () => {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  // Use languages from location state or fallback to empty array
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption | null>(
    state?.selectedLanguage || null,
  );

  const handleLanguageChange = (value: string) => {
    const selected = state?.languages?.find(lang => lang.label === value) || null;
    setSelectedLanguage(selected);
  };

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
        aria-label="Close scenario details"
      >
        <BackCircle />
      </motion.button>
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
        toast.success("Simulation ended successfully");
        setIsExistingSimulationConfirmOpen(false);
        refetchCredits();
        return;
      }
    }
    toast.error("Something went wrong!");
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
                  <span>Start</span>
                  <span className="font-bold italic"> Simulation</span>
                </div>
                <CreditsDisplay />
              </div>
            )}
            {/* Only show this DropdownField when state.languages has languages and language capability flag is enabled */}
            {state?.languages?.length > 0 && FEATURE_FLAGS_MAP.LANGUAGE_CAPABILITY_FLAG && (
              <div className="w-full sm:w-48 self-start">
                <div className="relative w-48">
                  <DropdownField
                    data-testid="language-dropdown"
                    options={state?.languages?.map(option => option.label) || []}
                    value={selectedLanguage?.label || ""}
                    onChange={handleLanguageChange}
                    valueClassName="text-typography-900 font-primary"
                  />
                </div>
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
              title={{ normal: "Active Simulation ", italic: "Detected" }}
              isOpen={isExistingSimulationConfirmOpen}
              onClose={() => setIsExistingSimulationConfirmOpen(false)}
              content="You have a running simulation. End the existing session to start a new one."
              buttonVariant={ButtonVariant.PRIMARY}
              onButtonClick={endExistingSimulation}
              buttonText="End session"
              secondaryButtonText="Cancel"
              onSecondaryButtonClick={onSecondaryButtonClick}
              icon={ExistingCall}
            />
            <CreditInfo
              data-testid="scenario-no-credits-dialog"
              open={noCreditsLeft}
              onClose={() => handleCreditClose("noCredits")}
              title="No Credits Left"
              description="Looks like you have run out of simulation credits"
              autoCloseDuration={AUTO_CLOSE_DIALOG_DURATION}
            />
            <CreditInfo
              data-testid="scenario-not-enough-credits-dialog"
              open={notEnoughCredits}
              onClose={() => handleCreditClose("notEnough")}
              title="Not Enough Credits"
              description="You don't have enough simulation credits to start this session"
              autoCloseDuration={AUTO_CLOSE_DIALOG_DURATION}
            />
            {FEATURE_FLAGS_MAP.MAX_ACTIVE_USERS_POPUP_FLAG && (
              <MaxActiveUsersDialog
                open={isMaxActiveUsersPopupOpen}
                onClose={() => setIsMaxActiveUsersPopupOpen(false)}
                onRetry={() => {}}
              />
            )}
          </motion.div>
        ) : (
          <FallbackUI
            data-testid="scenario-not-found"
            icon={<PageNotFoundIllustration />}
            isLoading={isScenarioLoading}
            mainMessage="Scenario not found"
            description="The scenario you are looking for does not exist."
          />
        )}
      </div>
    </AnimatePresence>
  );
};
