import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button, Popover } from "@mui/material";

import { useUser } from "@/hooks";
import { Lifeline, DefaultAvatar } from "@/assets/icons";
import { ToggleButtonGroup } from "@/components";
import { USER_STATUS_OPTIONS } from "@/constants/common";

const LifelineHeader = () => {
  const [status, setStatus] = useState("offline");
  const { logout } = useUser();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const handleChange = (newStatus: string) => {
    setStatus(newStatus);
  };

  return (
    <div className="bg-white border-b border-b-[#E5E7EB] p-4 h-20 py-3 top-0 sticky flex justify-between items-center">
      <Lifeline />
      <div className="flex gap-4 items-center">
        <ToggleButtonGroup
          value={status}
          onValueChange={handleChange}
          items={USER_STATUS_OPTIONS}
        />
        <Button onClick={handleClick} aria-describedby="profile">
          <DefaultAvatar />
        </Button>
        <Popover
          id="profile"
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
        >
          <Button sx={{ p: 2 }} onClick={() => {
            logout();
            navigate("/login");
          }}>Logout</Button>
        </Popover>
      </div>
    </div>
  );
};

export default LifelineHeader;
