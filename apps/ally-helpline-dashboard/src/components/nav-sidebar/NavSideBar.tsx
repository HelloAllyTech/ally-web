import { FunctionComponent, useState } from "react";

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { AccountCircle, Close, Logout } from "@assets/icons";
import { Confirm } from "@components";
import { TabId, Permissions, navBarOptions } from "@constants";
import { useUser } from "@hooks";
import { RootState } from "@store";
import { UserRole } from "@types";

import { NavSideBarProps } from "./types";

const NavSideBar: FunctionComponent<NavSideBarProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
}: NavSideBarProps) => {
  const { permissions, user, logout } = useUser();
  const { availableChatTypes } = useSelector((state: RootState) => state.user);

  //TODO: Remove this once we have a proper permission system
  const safePermissions = permissions || [];
  const filteredPermissions =
    user?.role === UserRole.ADMIN
      ? safePermissions
      : [Permissions.VIEW_NAVBAR_SEARCH, ...safePermissions];

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState<boolean>(false);
  const permittedTabs = navBarOptions.filter(
    tab => !tab.permission || filteredPermissions?.includes(tab.permission),
  );

  const navigate = useNavigate();

  const onTabClick = (id: TabId, path: string) => {
    if (id === TabId.COMMUNITY) {
      window.open(path, "_blank");
    } else {
      onTabChange(path);
    }
    onClose();
  };

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const handleConfirmLogout = () => {
    logout();
    navigate("/login");
  };

  const renderUserInfo = () => {
    return (
      <div
        className="flex items-center justify-between gap-2 border-gray-200 w-[calc(100%-30px)] 
          border-b border-b-[#E5E7EB py-[20px] px-[5px] mx-[15px]"
      >
        <div className="flex gap-3 flex-row items-center">
          <AccountCircle className="w-[30px] h-[30px]" />
          <div className="flex flex-col">
            <div className="text-[16px] font-[600px] text-gray-800">{user?.name}</div>
            <div className="text-[12px] text-gray-500">{user?.email}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderLogoutButton = () => {
    return (
      <button
        className="flex flex-row h-[60px] items-center px-[26px] border-t 
          border-t-[#E5E7EB] mx-[15px] cursor-pointer mb-[6px]"
        onClick={handleLogout}
      >
        <Logout />
        <div className="pl-[10px]">
          <div className="text-[16px] font-[600px] font-['IBM_Plex_Serif'] text-[#444]">
            Log Out
          </div>
        </div>
      </button>
    );
  };

  const renderTabs = () => {
    return (
      <div className="flex flex-col gap-1 m-3">
        {permittedTabs?.map(({ id, Icon, title, path }) => (
          <div
            key={id}
            className={`
          w-full h-14 rounded-md p-4 flex items-center gap-3 cursor-pointer
          ${activeTab === id ? "bg-[#F3F3F3]" : "hover:bg-[#F5F5F5]"}
          transition-all duration-300 group
        `}
            onClick={() => onTabClick(id, path)}
          >
            <Icon className={`${activeTab === id ? "stroke-[#000] stroke-[1px]" : ""}`} />
            <div
              className={`${
                activeTab === id ? "text-[#000] font-[500]" : "text-[#444] font-[400]"
              } font-['IBM_Plex_Serif'] text-[16px]`}
            >
              {title}
            </div>
            {id === TabId.COMMUNITY && (
              <OpenInNewIcon className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderCloseButton = () => {
    return (
      <div className="fixed inset-0 bg-black opacity-50 z-10 md:hidden" onClick={onClose}></div>
    );
  };

  const renderConfirmationBox = () => {
    return (
      <Confirm
        open={isLogoutConfirmOpen}
        onOpenChange={setIsLogoutConfirmOpen}
        text="Are you sure you want to log out? You will need to log back in to access your account."
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutConfirmOpen(false)}
        confirmText="Logout"
        cancelText="Cancel"
        destructive
        title="Logout"
      />
    );
  };

  return (
    <>
      {renderConfirmationBox()}
      <div
        className={`w-72 bg-[#F9FAFB] h-screen flex flex-col justify-between border-r border-r-[#E5E7EB]
          z-20 transition-all duration-300 ${isOpen ? "fixed" : "max-md:hidden md:fixed"}`}
      >
        <button onClick={onClose} className="md:hidden absolute top-4 right-4">
          <Close />
        </button>
        <div className="flex flex-col">
          {renderUserInfo()}
          {renderTabs()}
        </div>
        {renderLogoutButton()}
      </div>
      {isOpen && renderCloseButton()}
    </>
  );
};

export default NavSideBar;
