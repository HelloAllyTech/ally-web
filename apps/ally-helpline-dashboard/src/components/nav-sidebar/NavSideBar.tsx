import { FC, useEffect, useState } from "react";

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";

import { Ally, DockToRight, LogoutIllustration } from "@assets";
import { Carousel, CarouselSize, CarouselVariant, ConfirmationDialog, UserInfo } from "@components";
import { TabId, navBarOptions, CAROUSEL_SLIDES } from "@constants";
import { useUser } from "@hooks";
import { openLinkInNewTab } from "@utils";

import { ButtonVariant } from "../button";
import { NavSideBarProps, TabProps } from "./types";

const EXPANDED_WIDTH = 1200;

const Tab: FC<TabProps> = ({ id, Icon, title, activeTab, isExpanded, onClick }) => (
  <div
    className={`
          w-full h-12 rounded-md p-4 flex items-center gap-3 my-1 cursor-pointer
          ${activeTab === id ? "bg-[#F3F3F3] rounded-[2px]" : "hover:bg-[#F5F5F5]"}
          transition-all duration-300 group
        `}
    onClick={onClick}
  >
    <Icon className={`flex-shrink-0 ${activeTab === id ? "" : "opacity-60"} `} />

    {isExpanded && (
      <div
        className={`${
          activeTab === id ? "text-typography-900 font-[500]" : "text-typography-600 font-[400]"
        } font-primary text-lg`}
      >
        {title}
      </div>
    )}
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

  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < EXPANDED_WIDTH) {
        setIsExpanded(false);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const onTabClick = (id: TabId, path: string) => {
    if (id === TabId.COMMUNITY) {
      openLinkInNewTab(path);
    } else {
      onTabChange(path);
    }
    onClose();
  };

  const handleToggleSidebar = () => {
    setIsExpanded(!isExpanded);
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
      <div className="flex-1 flex-col gap-1 m-2 border-t border-t-[#E5E7EB] pt-3">
        {permittedTabs?.map(({ id, Icon, title, path }) => (
          <Tab
            key={id}
            id={id}
            Icon={Icon}
            title={title}
            activeTab={activeTab}
            isExpanded={isExpanded}
            onClick={() => onTabClick(id, path)}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <div
        className={`bg-white h-screen flex flex-col justify-between border-r border-r-[#E5E7EB] transition-all duration-300 relative ${
          isExpanded ? "w-64" : "w-24"
        } p-[12px] font-primary`}
      >
        <div className="flex justify-between">
          <Ally className="m-3 flex-shrink-0" />
          <button
            onClick={handleToggleSidebar}
            className={`${isExpanded ? "px-5 mx-2" : "absolute z-10 top-0 bg-white mx-2 px-[24px] py-[15px] opacity-0 hover:opacity-100"} hover:bg-gray-50 hover:rounded-md my-2 p-3`}
            title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <DockToRight />
          </button>
        </div>

        {renderTabs()}

        <div className="flex flex-col items-start gap-3 m-3">
          {isExpanded && (
            <Carousel
              slides={CAROUSEL_SLIDES}
              variant={CarouselVariant.DARK}
              size={CarouselSize.SMALL}
            />
          )}
          <hr className="w-full border-t border-gray-200" />
          <UserInfo user={user} onLogout={handleLogout} isExpanded={isExpanded} />
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
