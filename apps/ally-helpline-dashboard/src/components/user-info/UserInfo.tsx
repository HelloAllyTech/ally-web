import { FC, useEffect, useRef, useState } from "react";

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
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => setShowLogout(prev => !prev)}
        className="flex border-gray-200 
      px-3 py-2 items-center cursor-pointer"
      >
        <div className="flex gap-2 items-center">
          <AccountCircle className="w-[30px] h-[30px] flex-shrink-0" />
          <div className="flex flex-col font-['IBM_Plex_Serif']">
            <div className="text-[16px] text-gray-800 ">{user?.name}</div>
            <div className="text-[12px] text-gray-500 ">{user?.email}</div>
          </div>
        </div>
        <div className="flex-shrink-0">
          {showLogout ? (
            <Arrow className="w-5 h-2 -rotate-90 text-gray-600 transform transition-transform ease-in-out duration-300" />
          ) : (
            <Arrow className="w-5 h-2 text-gray-600 transition-transform duration-300" />
          )}
        </div>
      </div>

      {showLogout && (
        <div className="absolute top-2 left-full bg-white border shadow-md rounded-md p-2 w-[240px]">
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
