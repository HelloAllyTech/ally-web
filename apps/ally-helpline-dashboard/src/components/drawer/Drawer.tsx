import { FC } from "react";
import { Drawer as MuiDrawer } from "@mui/material";

import { ArrowDoubleRight } from "@/assets/icons";
import { DrawerProps } from "./types";

const Drawer: FC<DrawerProps> = ({ open, onClose, children, title }) => {
  return (
    <MuiDrawer
      anchor="right"
      open={open}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4 h-full py-4 px-6">
        <div className="flex items-center gap-4">
          <ArrowDoubleRight className="cursor-pointer" onClick={onClose} />
          <span className="text-[16px] font-semibold text-[#79747E]">{title || ""}</span>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </MuiDrawer>
  );
};

export default Drawer;
