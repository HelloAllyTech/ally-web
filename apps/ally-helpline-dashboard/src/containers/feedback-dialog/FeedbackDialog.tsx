import { FC } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { ComposedModal, ModalBody } from "@ally-ui-mono/ui-shared";
import { SessionType } from "@types";

import { CallFeedback, SimulationFeedback } from "./components";
import { FeedbackDialogProps } from "./types";

const FeedbackDialog: FC<FeedbackDialogProps> = ({
  id,
  open,
  sessionType,
  onClose,
  onSubmitComplete,
  initialRating,
  initialComment,
  initialTags,
}) => {
  const motionVariants = {
    initial: { opacity: 0, y: 16, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 16, scale: 0.98 },
  } as const;

  const getFeedbackContent = () => {
    switch (sessionType) {
      case SessionType.CALL:
        return <CallFeedback id={id} onSubmitComplete={onClose} />;
      case SessionType.SIMULATION:
        return (
          <SimulationFeedback
            id={id}
            onSubmitComplete={onSubmitComplete ?? onClose}
            initialRating={initialRating}
            initialComment={initialComment}
            initialTags={initialTags}
          />
        );
    }
  };

  return (
    <AnimatePresence>
      <ComposedModal open={open} onClose={onClose} size="sm" className="font-primary">
        <ModalBody className="overflow-hidden p-6">
          <motion.div
            initial={motionVariants.initial}
            animate={motionVariants.animate}
            exit={motionVariants.exit}
            transition={{
              duration: 0.25,
              ease: [0.4, 0, 0.2, 1],
              layout: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
            }}
            layout
            className="flex flex-col items-center gap-4 font-primary"
            style={{ overflow: "hidden", width: "100%" }}
          >
            {getFeedbackContent()}
          </motion.div>
        </ModalBody>
      </ComposedModal>
    </AnimatePresence>
  );
};

export default FeedbackDialog;
