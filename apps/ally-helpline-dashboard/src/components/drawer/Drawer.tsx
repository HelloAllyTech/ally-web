import { FC } from "react";

import { Drawer as MuiDrawer, Tooltip } from "@mui/material";
import { ChevronsRight } from "lucide-react";

import { toolTipStyles } from "@src/constants";

import { Button, ButtonVariant } from "../button";
import { DrawerProps } from "./types";

const Drawer: FC<DrawerProps> = ({
  open,
  onClose,
  children,
  title,
  headerButtons,
  className,
  drawerClassName,
  bodyClassName,
}) => {
  return (
    <MuiDrawer
      anchor="right"
      open={open}
      onClose={onClose}
      className={className}
      data-testid="drawer"
      PaperProps={{
        sx: {
          overflow: "hidden",
        },
      }}
    >
      <div
        className={`flex flex-col gap-4 h-full py-4 px-6 ${drawerClassName}`}
        data-testid="drawer-content"
      >
        <div className="flex items-center gap-4" data-testid="drawer-header">
          <ChevronsRight
            className="cursor-pointer"
            onClick={onClose}
            data-testid="drawer-close-button"
          />
          <div className="flex justify-between w-full items-center">
            <span
              className="text-lg font-semibold font-tertiary text-typography-700"
              data-testid="drawer-title"
            >
              {title || ""}
            </span>
            <div className="flex items-center gap-3" data-testid="drawer-header-buttons">
              {headerButtons
                ?.filter(button => button.show)
                .map(button => (
                  <Tooltip
                    key={button.alt}
                    title={button.text || ""}
                    placement="top"
                    arrow
                    slotProps={toolTipStyles}
                  >
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
        </div>
        <div className={`flex-1 ${bodyClassName}`} data-testid="drawer-body">
          {children}
        </div>
      </div>
    </MuiDrawer>
  );
};

export default Drawer;
