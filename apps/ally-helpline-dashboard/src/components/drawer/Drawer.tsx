import { FC } from "react";

import { Drawer as MuiDrawer } from "@mui/material";
import { ChevronsRight } from "lucide-react";

import { DrawerProps } from "./types";
import { Button, ButtonVariant } from "../button";

const Drawer: FC<DrawerProps> = ({ open, onClose, children, title, headerButtons, className }) => {
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
      <div className="flex flex-col gap-4 h-full py-4 px-6" data-testid="drawer-content">
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
                  <Button
                    key={button.alt}
                    data-testid={`drawer-header-button-${button.alt}`}
                    variant={ButtonVariant.ICON}
                    onClick={button.onClick}
                    className="flex items-center gap-2 font-tertiary text-xs text-typography-900"
                  >
                    {button.icon}
                    {button.text}
                  </Button>
                ))}
            </div>
          </div>
        </div>
        <div className="flex-1" data-testid="drawer-body">
          {children}
        </div>
      </div>
    </MuiDrawer>
  );
};

export default Drawer;
