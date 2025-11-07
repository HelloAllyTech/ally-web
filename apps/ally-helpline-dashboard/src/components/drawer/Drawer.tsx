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
      PaperProps={{
        sx: {
          overflow: "hidden",
        },
      }}
    >
      <div className="flex flex-col gap-4 h-full py-4 px-6">
        <div className="flex items-center gap-4">
          <ChevronsRight className="cursor-pointer" onClick={onClose} />
          <div className="flex justify-between w-full items-center">
            <span className="text-[16px] font-semibold font-tertiary text-[#79747E]">
              {title || ""}
            </span>
            <div className="flex items-center gap-3">
              {headerButtons
                ?.filter(button => button.show)
                .map(button => (
                  <Button
                    key={button.alt}
                    variant={ButtonVariant.ICON}
                    onClick={button.onClick}
                    className="flex items-center gap-2 font-tertiary text-[12px] text-[#1A1A1A]"
                  >
                    {button.icon}
                    {button.text}
                  </Button>
                ))}
            </div>
          </div>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </MuiDrawer>
  );
};

export default Drawer;
