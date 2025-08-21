import { motion } from "framer-motion";

import { Button } from "@/components";
import { SocketDisconnectionReasons } from "@/constants/socket";

import { getContentByDisconnectionReason } from "./utils";

const ErrorScreen = ({
  socketDisconnectionReason,
}: {
  socketDisconnectionReason: SocketDisconnectionReasons;
}) => {
  if (!socketDisconnectionReason) return null;

  const {
    icon: Icon,
    title,
    description,
  } = getContentByDisconnectionReason(socketDisconnectionReason);

  return (
    <motion.div
      key={socketDisconnectionReason}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.1,
      }}
      className="flex flex-col justify-center items-center gap-4 w-80"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Icon />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="text-[#0D0D0D] text-2xl text-center mt-1"
      >
        {title}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="text-[#0D0D0D] text-sm text-center mt-1"
      >
        {description}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="w-full text-center flex justify-center items-center gap-4 mt-1"
      >
        <Button
          variant="outline"
          className="rounded-full w-full"
          onClick={() => window.history.back()}
        >
          Go back
        </Button>
        <Button className="rounded-full w-full" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default ErrorScreen;
