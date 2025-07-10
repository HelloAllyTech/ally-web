import { FC } from "react";
import { Drawer as MuiDrawer } from "@mui/material";
import { ChevronsRight } from "lucide-react";

import { DrawerProps } from "./types";

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
          <div className="flex justify-between w-full">
            <span className="text-[16px] font-semibold text-[#79747E]">{title || ""}</span>
            <div className="flex items-center gap-2">
              {headerButtons?.map(button => (
                <button
                  key={button.alt}
                  onClick={button.onClick}
                  className={`${button.show ? "" : "hidden"}`}
                >
                  {button.icon}
                </button>
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
