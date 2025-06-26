import React from "react";
import { Button } from "../generic/button";

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  text: string | React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  destructive?: boolean;
}

const Confirm = ({
  open,
  onOpenChange,
  title,
  text,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  isLoading = false,
  destructive = false,
}: ConfirmProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg py-4 px-6 w-full max-w-[420px] border border-gray-200 flex flex-col gap-4">
        <div>
          {title && (
            <h3 className="text-[15px] font-[600] text-[#47464F] mb-2">{title}</h3>
          )}
          <div className="text-[15px] text-[#47464F]">
            {text}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
            disabled={isLoading}
            className="py-2.5 px-6 flex-1 text-center text-[15px] font-medium text-[#47464F] bg-white border border-[#C8C5D0] rounded-full hover:bg-gray-50 disabled:opacity-50"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={isLoading}
            className={`py-2.5 flex-1 px-6 text-center text-[15px] font-medium text-white rounded-full disabled:opacity-50 ${
              destructive
                ? "bg-[#F93535] hover:bg-[#F93535]"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {isLoading ? "..." : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Confirm;
