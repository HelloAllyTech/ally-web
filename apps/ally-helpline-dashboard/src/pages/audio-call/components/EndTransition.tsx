import { motion } from "framer-motion";
import AudioCallBackgroundWrapper from "./AudioCallBackgroundWrapper";

interface EndTransitionScreenProps {
  endingMessage: string;
}

const EndTransitionScreen = ({ endingMessage }: EndTransitionScreenProps) => {
  return (
    <AudioCallBackgroundWrapper>
      <motion.div
        key={endingMessage}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 z-50 flex items-center justify-center"
      >
        <div className="text-white text-4xl font-bold">{endingMessage}</div>
      </motion.div>
    </AudioCallBackgroundWrapper>
  );
};

export default EndTransitionScreen;
