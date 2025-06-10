import React from "react";

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string | React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

const Confirm = ({
  open,
  onOpenChange,
  text,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  isLoading = false,
}: ConfirmProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-4 max-w-md w-full mx-4">
        <div
          className="max-w-full rounded-lg px-4 py-2 text-sm mb-4"
          style={{
            background:
              "linear-gradient(134.31deg, #D8C3F9 -105.84%, #EDF7EA -3.5%, #DAE3F8 62.45%)",
          }}
        >
          <div className="break-words p-2">{text}</div>
        </div>
        <div className="flex gap-8 text-sm justify-center">
          <button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            disabled={isLoading}
            className="w-20 text-center bg-[#EAF4ED] hover:bg-[#d5e6da] rounded-[38px] px-4 py-1 border border-[#D9D9D9] disabled:opacity-50"
          >
            {isLoading ? "..." : confirmText}
          </button>
          <button
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
            disabled={isLoading}
            className="w-20 text-center bg-[#EAF4ED] hover:bg-[#d5e6da] rounded-[38px] px-4 py-1 border border-[#D9D9D9]"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Confirm;
