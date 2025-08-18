import { FC, SVGProps, useState } from "react";

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";

import { AccountCircle, Close, Logout, LogoutIllustration } from "@assets/icons";
import { Button, Carousel, CarouselSize, CarouselVariant, ConfirmationDialog } from "@components";
import { TabId, Permissions, navBarOptions, CAROUSEL_SLIDES } from "@constants";
import { useUser } from "@hooks";
import { User, UserRole } from "@types";

import { ButtonVariant } from "../button";
import { NavSideBarProps } from "./types";

const UserInfo: FC<{ user?: User }> = ({ user }) => (
  <div
    className="flex items-center justify-between gap-2 border-gray-200 w-[calc(100%-30px)] 
    border-b border-b-[#E5E7EB] py-[20px] px-[5px] mx-[15px]"
  >
    <div className="flex gap-3 flex-row items-center">
      <AccountCircle className="w-[30px] h-[30px]" />
      <div className="flex flex-col">
        <div className="text-[16px] text-gray-800">{user?.name}</div>
        <div className="text-[12px] text-gray-500">{user?.email}</div>
      </div>
    </div>
  </div>
);

const LogoutButton: FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button
    variant={ButtonVariant.TEXT}
    onClick={onClick}
    className="flex flex-row h-[60px] items-center px-[26px] border-t 
    border-t-[#E5E7EB] mx-[15px] mb-[6px] justify-start rounded-none hover:bg-gray-50"
  >
    <Logout />
    <div className="pl-[10px] text-[16px] font-['IBM_Plex_Serif'] text-[#444]">Log Out</div>
  </Button>
);

const Tab: FC<{
  id: TabId;
  Icon: FC<SVGProps<SVGSVGElement>>;
  title: string;
  activeTab: TabId;
  onClick: () => void;
}> = ({ id, Icon, title, activeTab, onClick }) => (
  <div
    className={`
          w-full h-14 rounded-md p-4 flex items-center gap-3 cursor-pointer
          ${activeTab === id ? "bg-[#F3F3F3]" : "hover:bg-[#F5F5F5]"}
          transition-all duration-300 group
        `}
    onClick={onClick}
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
);

const NavSideBar: FC<NavSideBarProps> = ({ activeTab, onTabChange, isOpen, onClose }) => {
  const { permissions, user, logout } = useUser();

  //TODO: Remove this once we have a proper permission system
  const safePermissions = permissions || [];
  const filteredPermissions =
    user?.role === UserRole.ADMIN
      ? safePermissions
      : safePermissions.concat([Permissions.VIEW_NAVBAR_SEARCH]);

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState<boolean>(false);
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
    setIsLogoutDialogOpen(true);
  };

  const closeLogoutDialog = () => {
    setIsLogoutDialogOpen(false);
  };

  const handleConfirmLogout = () => {
    logout();
    navigate("/login");
  };

  const renderTabs = () => {
    return (
      <div className="flex flex-col gap-1 m-3">
        {permittedTabs?.map(({ id, Icon, title, path }) => (
          <Tab
            key={id}
            id={id}
            Icon={Icon}
            title={title}
            activeTab={activeTab}
            onClick={() => onTabClick(id, path)}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div
        className={`w-72 bg-white h-screen flex flex-col justify-between border-r border-r-[#E5E7EB]
          z-20 transition-all duration-300 ${isOpen ? "fixed" : "max-md:hidden md:fixed"}`}
      >
        <button onClick={onClose} className="md:hidden absolute top-4 right-4">
          <Close />
        </button>
        <div className="flex flex-col">
          <UserInfo user={user} />
          {renderTabs()}
        </div>
        <div className="flex flex-col items-center gap-3 m-3">
          <Carousel
            slides={CAROUSEL_SLIDES}
            variant={CarouselVariant.DARK}
            size={CarouselSize.SMALL}
          />
          <LogoutButton onClick={handleLogout} />
        </div>
      </div>
      <ConfirmationDialog
        title={{ normal: "Safeguard your ", italic: "account" }}
        isOpen={isLogoutDialogOpen}
        onClose={closeLogoutDialog}
        content="Are you sure you want to log out? You will need to enter secure OTP to login again."
        buttonVariant={ButtonVariant.DESTRUCTIVE}
        onButtonClick={handleConfirmLogout}
        buttonText="Logout & lock my Ally account"
        icon={LogoutIllustration}
      />
      {isOpen && (
        <div className="fixed inset-0 bg-black opacity-50 z-10 md:hidden" onClick={onClose}></div>
      )}
    </>
  );
};

export default NavSideBar;
