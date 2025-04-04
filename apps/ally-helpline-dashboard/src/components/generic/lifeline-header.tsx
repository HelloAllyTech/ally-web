import { useState } from "react";
import { matchPath, useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { Avatar, Popover } from "@mui/material";

import { RootState, store } from "@/store/store";
import { setUserStatus } from "@/reducer/userReducer";
import { useUser } from "@/hooks";
import { Lifeline } from "@/assets/icons";
import { Button, ToggleButtonGroup } from "@/components";
import { USER_STATUS_OPTIONS, UserStatus } from "@/constants/common";
import { UserRole } from "@/types/user";
import { ROUTES } from "@/constants/routes";

const LifelineHeader = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const { userStatus } = useSelector((state: RootState) => state.user);

  const { logout, user } = useUser();

  const open = Boolean(anchorEl);
  const isStatusSwitchDisabled = matchPath(ROUTES.SUMMARY, pathname);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleChange = (newStatus: UserStatus) => {
    store.dispatch(setUserStatus(newStatus));
    localStorage.setItem("userStatus", newStatus);
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
            disabled={!!isStatusSwitchDisabled}
            className={isStatusSwitchDisabled ? "opacity-40" : ""}
          />
        )}
        <Avatar
          component="button"
          onClick={handleClick}
          aria-describedby="profile"
          sx={{
            backgroundColor: "#E8F3FF",
            color: "#000",
            border: "1px solid rgba(2, 120, 254, 0.09)",
            fontSize: "16px",
            fontWeight: "500",
            cursor: "pointer",
          }}
        >
          {user?.name[0]}
        </Avatar>
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
          {/* TODO: Could use MenuItem here */}
          <Button
            variant="secondary"
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
