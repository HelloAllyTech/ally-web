import { FC } from "react";
import { Drawer as MuiDrawer } from "@mui/material";
import { X } from "lucide-react";

import { DrawerProps } from "./types";

const Drawer: FC<DrawerProps> = ({ open, onClose, children, title }) => {
  return (
    <MuiDrawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: "800px",
          padding: "24px",
          bgcolor: "#FFFFFF",
        },
      }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[16px] font-medium text-[#47464F]">
            {title || ""}
          </span>
          <X 
            className="cursor-pointer text-[#79747E] hover:text-[#47464F] transition-colors" 
            onClick={onClose}
          />
        </div>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </MuiDrawer>
  );
};

export default Drawer;
