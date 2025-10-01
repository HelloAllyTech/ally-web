import { FC, useEffect, useRef, useState } from "react";

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import { AccountCircle, Arrow, Logout } from "@assets";
import { User } from "@types";

const UserInfo: FC<{ user?: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [showLogout, setShowLogout] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowLogout(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => setShowLogout(prev => !prev)}
        className="flex border-gray-200 w-[calc(100%-30px)] 
          py-[20px] px-[5px] mx-[10px] gap-[10px] items-center 
          cursor-pointer"
      >
        <AccountCircle className="w-[30px] h-[30px]" />
        <div className="flex flex-col font-['IBM_Plex_Serif']">
          <div className="text-[16px] text-gray-800">{user?.name}</div>
          <div className="text-[12px] text-gray-500">{user?.email}</div>
        </div>
        {showLogout ? (
          <Arrow className="w-5 h-2 rotate-180 text-gray-600 transform transition-transform ease-in-out duration-300" />
        ) : (
          <Arrow className="w-5 h-2  text-gray-600 transition-transform duration-300" />
        )}
      </div>

      {showLogout && (
        <div className="absolute right-[-10px] top-[-50px] bg-white border shadow-md rounded-md p-2 w-[240px]">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-gray-700 hover:bg-gray-100 py-1 px-2 rounded justify-start w-full"
          >
            <Logout className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserInfo;
