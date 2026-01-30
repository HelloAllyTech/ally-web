import { ReactNode, useEffect, useRef } from "react";

import { Button } from "@components";

interface ConfirmationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  anchorElement?: HTMLElement | null;
  title?: ReactNode;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
  isLoading?: boolean;
}

const ConfirmationPopover = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
  isLoading = false,
}: ConfirmationPopoverProps) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        ref={popoverRef}
        className="bg-white rounded-lg shadow-xl border border-gray-200 p-5 min-w-[300px] max-w-[400px] mx-4 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex flex-col gap-3">
          <div className="font-medium text-base text-typography-900 text-center">{title}</div>
          <div className="text-sm text-typography-600 text-center">{message}</div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Button
              variant="secondary"
              className="py-1 px-4 h-9 text-sm w-full"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant={confirmVariant === "danger" ? "primary" : "primary"}
              className={`py-1 px-4 h-9 text-sm w-full ${confirmVariant === "danger" ? "!bg-red-500 hover:!bg-red-600" : ""}`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? "..." : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPopover;
