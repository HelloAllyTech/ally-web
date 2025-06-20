import { FunctionComponent } from "react";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useNavigate } from "react-router-dom";

import { useUser } from "@/hooks";
import { navBarOptions } from "@/constants/routes";
import { AccountCircle, Logout } from "@/assets/icons";

import { NavSideBarProps } from "./types";
import { TabId } from "@/constants/tabs";

const NavSideBar: FunctionComponent<NavSideBarProps> = ({
  activeTab,
  onTabChange,
}: NavSideBarProps) => {
  const { permissions } = useUser();
  const permittedTabs = navBarOptions.filter(
    (tab) => !tab.permission || permissions.includes(tab.permission)
  );

  const navigate = useNavigate();
  const { logout, user } = useUser();

  const onTabClick = (id: TabId, path: string) => {
    if (id === TabId.COMMUNITY) {
      window.open(path, "_blank");
    } else {
      onTabChange(path);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const renderUserInfo = () => {
    return (
      <div className="flex items-center justify-between gap-2 border-gray-200 w-[calc(100%-30px)] border-b border-b-[#E5E7EB py-[20px] px-[5px] mx-[15px]">
        <div className="flex gap-3 flex-row items-center">
        <AccountCircle className="w-[30px] h-[30px]" />
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-gray-800">{user?.name}</div>
          <div className="text-xs text-gray-500">{user?.email}</div>
        </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2">
          <Logout />
        </button>
      </div>
    );
  };

  return (
    <div className="w-72 bg-white border-r border-r-[#E5E7EB] fixed h-screen">
      {renderUserInfo()}
      <div className="flex flex-col gap-1 m-3">
        {permittedTabs.map(({ id, Icon, title, path }) => (
          <div
            key={id}
            className={`
                w-full h-14 rounded-md p-4 flex items-center gap-3 cursor-pointer
                ${activeTab === id ? "bg-[#F3F3F3]" : "hover:bg-[#F5F5F5]"}
                transition-all duration-300 group
              `}
            onClick={() => onTabClick(id, path)}
          >
            <Icon
              sx={{ fill: activeTab === id ? "#000" : "" }}
              fill={activeTab === id ? "#000" : ""}
              className="transition-all duration-300"
            />
            <div
              className={`${activeTab === id
                ? "text-[#000] font-semibold"
                : "text-[#444] font-medium"
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
    </div>
  );
};

export default NavSideBar;
