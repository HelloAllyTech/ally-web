import { FC } from "react";

import { Dialog } from "@mui/material";
import { motion } from "framer-motion";

import { CloseIcon } from "@assets/icons";

import { Button, ButtonVariant } from "../button";
import { ConfirmationDialogProps } from "./types";

const ConfirmationDialog: FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  content,
  buttonText,
  buttonVariant,
  onButtonClick,
  footerText,
  children,
  secondaryButtonText,
  secondaryButtonVariant,
  onSecondaryButtonClick,
}) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="confirmation-dialog-title"
      aria-describedby="confirmation-dialog-description"
      PaperProps={{
        style: {
          borderRadius: "8px",
        },
      }}
    >
      <motion.div
        className="max-w-[500px] min-w-[200px] flex flex-col gap-4 items-center p-4 sm:p-6 md:p-10 relative mx-4"
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.3,
          ease: "easeOut",
          type: "spring",
          stiffness: 300,
          damping: 25,
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          className="absolute top-3 right-3"
        >
          <CloseIcon onClick={onClose} className="cursor-pointer" />
        </motion.div>

        <motion.div
          className="text-[30px] font-secondary text-[#434343]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <span>{title.normal} </span>
          <span className="italic font-bold">{title.italic}</span>
        </motion.div>

        {Icon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <Icon />
          </motion.div>
        )}

        <motion.p
          id="confirmation-dialog-description"
          className="text-center font-primary text-sm sm:text-base"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          {content}
        </motion.p>

        {children}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.3 }}
        >
          <div className="w-full flex items-center justify-center gap-2">
            {secondaryButtonText && (
              <Button
                fullWidth
                onClick={onSecondaryButtonClick}
                variant={secondaryButtonVariant ?? ButtonVariant.SECONDARY}
              >
                {secondaryButtonText}
              </Button>
            )}
            <Button fullWidth onClick={onButtonClick} variant={buttonVariant}>
              {buttonText}
            </Button>
          </div>
        </motion.div>

        {footerText && (
          <motion.span
            className="text-xs sm:text-xs text-typography-500 font-primary text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            {footerText}
          </motion.span>
        )}
      </motion.div>
    </Dialog>
  );
};

export default ConfirmationDialog;
