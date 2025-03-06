/* eslint-disable max-len */
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import DateRangeOutlinedIcon from "@mui/icons-material/DateRangeOutlined";
import LeaderboardOutlinedIcon from "@mui/icons-material/LeaderboardOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

import { TabId } from "@/constants/tabs";

import { Book, Relax } from "@/assets/icons";

interface NavSideBarProps {
  activeTab: TabId;
  onTabChange: (tab: string) => void;
}

const NavSideBar = ({ activeTab, onTabChange }: NavSideBarProps) => {
  const NAVIGATION = [
    {
      id: "calls",
      title: TabId.CALLS,
      Icon: PhoneOutlinedIcon,
    },
    {
      id: "calender",
      title: TabId.CALENDER,
      Icon: DateRangeOutlinedIcon,
    },
    {
      id: "learn",
      title: TabId.LEARN,
      Icon: Book,
    },
    {
      id: "stress_busters",
      title: TabId.STRESS_BUSTERS,
      Icon: Relax,
    },
    {
      id: "analytics",
      title: TabId.ANALYTICS,
      Icon: LeaderboardOutlinedIcon,
    },
    {
      id: "settings",
      title: TabId.SETTINGS,
      Icon: SettingsOutlinedIcon,
    },
  ];
  return (
    <div className="w-72 bg-white border-r border-r-[#E5E7EB] mt-20 fixed h-screen">
      <div className="flex flex-col gap-0 m-3">
        {NAVIGATION.map(({ id, Icon, title }) => (
          <div
            key={id}
            className={`w-full h-14 rounded-md p-4 flex items-center gap-3 cursor-pointer ${activeTab === title && "bg-[#D7EAFF]"} transition-all duration-300`}
            onClick={() => onTabChange(id)}
          >
            <Icon
              sx={{ fill: activeTab === title ? "#6272FF" : "" }}
              fill={activeTab === title ? "#6272FF" : ""}
              className="transition-all duration-300"
            />
            <div className="font-semibold text-sm">{title}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NavSideBar;
