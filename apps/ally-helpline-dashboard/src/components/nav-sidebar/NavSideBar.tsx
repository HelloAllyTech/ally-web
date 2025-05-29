import { FunctionComponent } from "react";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { useUser } from "@/hooks";
import { navBarOptions } from "@/constants/routes";

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

  const onTabClick = (id: TabId, path: string) => {
    if (id === TabId.COMMUNITY) {
      window.open(path, "_blank");
    } else {
      onTabChange(path);
    }
  };

  return (
    <div className="w-72 bg-white border-r border-r-[#E5E7EB] mt-20 fixed h-screen">
      <div className="flex flex-col gap-0 m-3">
        {permittedTabs.map(({ id, Icon, title, path }) => (
          <div
            key={id}
            className={`
              w-full h-14 rounded-md p-4 flex items-center gap-3 cursor-pointer
              ${activeTab === id ? "bg-[#D7EAFF]" : "hover:bg-[#F5F5F5]"}
              transition-all duration-300 group
            `}
            onClick={() => onTabClick(id, path)}
          >
            <Icon
              sx={{ fill: activeTab === id ? "#6272FF" : "" }}
              fill={activeTab === id ? "#6272FF" : ""}
              className="transition-all duration-300"
            />
            <div className="font-semibold text-sm">{title}</div>
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
