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
            // Header buttons are pinned to the top of the viewport. The shared
            // Tooltip enables Carbon's autoAlign by default, so the default
            // top-alignment flips downward into the drawer body instead of
            // clipping off-screen — no manual align override needed.
            <Tooltip key={button.alt} label={button.text || ""}>
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
    // drawerClassName carries the panel width (e.g. w-[50vw] min-w-[600px]); it
    // must reach the panel <aside> so the panel is as wide as its content.
    <SidePanel
      open={open}
      onClose={onClose}
      side="right"
      title={header}
      className={drawerClassName}
    >
      <div className="flex flex-col gap-4 h-full" data-testid="drawer-content">
        <div className={`flex-1 ${bodyClassName ?? ""}`} data-testid="drawer-body">
          {children}
        </div>
      </div>
    </SidePanel>
  );
};

export default Drawer;
