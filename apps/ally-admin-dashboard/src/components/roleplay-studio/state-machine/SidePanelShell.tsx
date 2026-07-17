import React from "react";

import { Button, IconButton } from "@ally-ui-mono/ui-shared";
import { Close } from "@assets";
import { en } from "@constants";

interface SidePanelShellProps {
  title: string;
  onCancel: () => void;
  onSave: () => void;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Right-hand overlay panel shell (visual pattern borrowed from
 * character-side-panel): dimmed backdrop, white panel, pinned footer. Chrome is
 * built from Carbon actions (IconButton close, primary/secondary Buttons).
 */
export const SidePanelShell: React.FC<SidePanelShellProps> = ({
  title,
  onCancel,
  onSave,
  headerExtra,
  children,
}) => (
  <div className="fixed inset-0 z-50 flex">
    <div className="flex-1 bg-black bg-opacity-50" onClick={onCancel} />
    <div className="relative flex h-full w-[42%] min-w-[440px] max-w-[640px] flex-col bg-white shadow-xl">
      <div className="flex items-center justify-between p-6 pb-4">
        <h2 className="text-xl font-medium text-typography-900">{title}</h2>
        <div className="flex items-center gap-3">
          {headerExtra}
          <IconButton
            label={en.common.cancel}
            kind="ghost"
            size="sm"
            align="bottom"
            onClick={onCancel}
          >
            <Close />
          </IconButton>
        </div>
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      <div className="relative z-10 mt-auto flex w-full shrink-0 items-center justify-center gap-4 bg-white p-4 border-t border-border-light">
        <Button kind="secondary" className="min-w-[120px]" onClick={onCancel} type="button">
          {en.common.cancel}
        </Button>
        <Button kind="primary" className="min-w-[120px]" onClick={onSave} type="button">
          {en.common.save}
        </Button>
      </div>
    </div>
  </div>
);
