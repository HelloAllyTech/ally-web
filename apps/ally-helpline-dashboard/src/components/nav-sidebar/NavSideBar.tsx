import { FC, useState } from "react";

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";

import { Ally, Close, LogoutIllustration } from "@assets";
import { Carousel, CarouselSize, CarouselVariant, ConfirmationDialog, UserInfo } from "@components";
import { TabId, navBarOptions, CAROUSEL_SLIDES } from "@constants";
import { useUser } from "@hooks";
import { openLinkInNewTab } from "@utils";

import { ButtonVariant } from "../button";
import { NavSideBarProps, TabProps } from "./types";

const Tab: FC<TabProps> = ({ id, Icon, title, activeTab, onClick }) => (
  <div
    className={`
          w-full h-14 rounded-md p-4 flex items-center gap-3 cursor-pointer
          ${activeTab === id ? "bg-[#F3F3F3] rounded-[2px]" : "hover:bg-[#F5F5F5]"}
          transition-all duration-300 group
        `}
    onClick={onClick}
  >
    <Icon className={`${activeTab === id ? "" : "opacity-60"}`} />
    <div
      className={`${
        activeTab === id ? "text-[#000] font-[500]" : "text-[#6B7280] font-[400]"
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

  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState<boolean>(false);
  const permittedTabs = navBarOptions.filter(
    tab =>
      !tab.permissions || permissions?.some(permission => tab.permissions.includes(permission)),
  );

  const navigate = useNavigate();

  const onTabClick = (id: TabId, path: string) => {
    if (id === TabId.COMMUNITY) {
      openLinkInNewTab(path);
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
      <div className="flex flex-col gap-1 m-3 border-t border-t-[#E5E7EB] pt-3">
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
        transition-all duration-300 ${isOpen ? "z-20" : "max-md:hidden"}`}
      >
        <button onClick={onClose} className="md:hidden absolute top-4 right-4">
          <Close />
        </button>

        <div className="flex flex-col">
          <Ally className="m-3 mt-7" />
          {renderTabs()}
        </div>

        <div className="flex flex-col items-start gap-3 m-3">
          <Carousel
            slides={CAROUSEL_SLIDES}
            variant={CarouselVariant.DARK}
            size={CarouselSize.SMALL}
          />
          <hr className="w-full border-t border-gray-200" />
          <UserInfo user={user} onLogout={handleLogout} />
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
