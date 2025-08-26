import { FC } from "react";

import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";

import { BackCircle } from "@assets";
import { ScenarioDetailsCard } from "@components";
import { ROUTES } from "@constants";

import { dummyScenarios, learnPageExpandedVariants } from "../learn/constants";

export const Scenario: FC = () => {
  const { scenarioId } = useParams();
  const navigate = useNavigate();

  // TODO: Remove dummy data once API is implemented
  const scenario = dummyScenarios.find(scenario => scenario.unique_id === scenarioId);

  const renderBackButton = () => {
    return (
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        onClick={() => navigate(ROUTES.LEARN)}
        className="hover:scale-105 transition-transform absolute top-[5px] sm:top-[90px] left-[calc(100%-30px)] sm:left-[0px]"
        aria-label="Close scenario details"
      >
        <BackCircle />
      </motion.button>
    );
  };

  //   const renderSimulationLoading = () => {
  //     return (
  //       <div className="flex justify-center items-center absolute top-0 left-0 bg-white w-full h-full z-50">
  //         <div className="flex flex-col items-center justify-center">
  //           <div className="flex flex-col items-center justify-center h-full text-center">
  //             <p className="text-[24px] font-[500] text-[#0D0D0D] mb-[20px]">
  //               Simulation starting...
  //             </p>
  //             <p className="text-[14px] text-[#656565]">
  //               To start the simulation, please allow us to use your microphone.
  //             </p>
  //           </div>
  //         </div>
  //       </div>
  //     );
  //   };

  return (
    <AnimatePresence mode="wait">
      {scenario && (
        <motion.div
          variants={learnPageExpandedVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white sm:px-[60px] w-full max-w-2xl mx-auto relative"
        >
          {renderBackButton()}
          <ScenarioDetailsCard
            coverImage={scenario?.cover_image || ""}
            title={scenario?.title || ""}
            description={scenario?.short_description || ""}
            longDescription={scenario?.long_description || ""}
            onStart={() => {
              console.log("onStart");
              navigate(`/simulation-summary`);
            }}
          />
        </motion.div>
      )}
      {/* TODO: Add temporary OTP input dialog when clicking on start simulation */}
      {/* {isCreatingRoom && renderSimulationLoading()} */}
      {/* <LoginPopup
        isOpen={openLoginPopup}
        onSubmit={handleLogin}
        onSendOtpTrigger={handleOtpGeneration}
        onClose={() => setOpenLoginPopup(false)}
      /> */}
    </AnimatePresence>
  );
};
