import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { Button, Popover } from "@mui/material";

import { RootState, store } from "@/store/store";
import { setIsOnline } from "@/reducer/userReducer";
import { useUser } from "@/hooks";
import { Lifeline, DefaultAvatar } from "@/assets/icons";
import { ToggleButtonGroup } from "@/components";
import { USER_STATUS_OPTIONS, UserStatus } from "@/constants/common";

const LifelineHeader = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const { isOnline } = useSelector((state: RootState) => state.user);

  const { logout } = useUser();
  const navigate = useNavigate();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const handleChange = (newStatus: UserStatus) => {
    store.dispatch(setIsOnline(newStatus === UserStatus.AVAILABLE));
  };

  return (
    <div className="bg-white border-b border-b-[#E5E7EB] p-4 h-20 py-3 top-0 sticky flex justify-between items-center">
      <Lifeline />
      <div className="flex gap-4 items-center">
        <ToggleButtonGroup
          value={isOnline ? UserStatus.AVAILABLE : UserStatus.OFFLINE}
          onValueChange={handleChange}
          items={USER_STATUS_OPTIONS}
          successValue={UserStatus.AVAILABLE}
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
