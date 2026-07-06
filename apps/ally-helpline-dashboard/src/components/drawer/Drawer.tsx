import { FC } from "react";

import { SidePanel, Tooltip } from "@ally-ui-mono/ui-shared";

import { Button, ButtonVariant } from "../button";
import { DrawerProps } from "./types";

const Drawer: FC<DrawerProps> = ({
  open,
  onClose,
  children,
  title,
  headerButtons,
  drawerClassName,
  bodyClassName,
}) => {
  const header = (
    <div
      className="flex justify-between w-full items-center min-w-0 flex-1 gap-4"
      data-testid="drawer-header"
    >
      <div
        className="text-lg font-semibold font-tertiary text-typography-700 min-w-0 flex-1"
        data-testid="drawer-title"
      >
        {title || ""}
      </div>
      <div className="flex items-center gap-3" data-testid="drawer-header-buttons">
        {headerButtons
          ?.filter(button => button.show)
          .map(button => (
            <Tooltip key={button.alt} label={button.text || ""} align="top">
              <span style={{ display: "inline-flex" }}>
                <Button
                  data-testid={`drawer-header-button-${button.alt}`}
                  variant={ButtonVariant.ICON}
                  onClick={button.onClick}
                  className="flex items-center gap-2 font-tertiary text-xs text-typography-900"
                >
                  {button.icon}
                </Button>
              </span>
            </Tooltip>
          ))}
      </div>
    </div>
  );

  return (
    <SidePanel open={open} onClose={onClose} side="right" title={header}>
      <div
        className={`flex flex-col gap-4 h-full ${drawerClassName ?? ""}`}
        data-testid="drawer-content"
      >
        <div className={`flex-1 ${bodyClassName ?? ""}`} data-testid="drawer-body">
          {children}
        </div>
      </div>
    </SidePanel>
  );
};

export default Drawer;
