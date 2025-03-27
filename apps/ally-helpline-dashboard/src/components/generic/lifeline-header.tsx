import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { Button, Popover } from "@mui/material";

import { RootState, store } from "@/store/store";
import { setUserStatus } from "@/reducer/userReducer";
import { useUser } from "@/hooks";
import { Lifeline, DefaultAvatar } from "@/assets/icons";
import { ToggleButtonGroup } from "@/components";
import { USER_STATUS_OPTIONS, UserStatus } from "@/constants/common";
import { UserRole } from "@/types/user";

const LifelineHeader = () => {
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const { userStatus } = useSelector((state: RootState) => state.user);

  const { logout, user } = useUser();

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (newStatus: UserStatus) => {
    store.dispatch(setUserStatus(newStatus));
    localStorage.setItem("isOnline", newStatus);
  };

  return (
    <div className="bg-white border-b border-b-[#E5E7EB] p-4 h-20 py-3 top-0 sticky flex justify-between items-center">
      <Lifeline className="cursor-pointer" onClick={() => navigate("/")} />
      <div className="flex gap-4 items-center">
        {user?.role === UserRole.COUNSELOR && (
          <ToggleButtonGroup
            value={userStatus}
            onValueChange={handleChange}
            items={USER_STATUS_OPTIONS}
            successValue={UserStatus.AVAILABLE}
          />
        )}
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
          <Button
            sx={{ p: 2 }}
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Logout
          </Button>
        </Popover>
      </div>
    </div>
  );
};

export default LifelineHeader;
