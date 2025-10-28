import { FC, useEffect, useRef, useState } from "react";

import { AccountCircle, Arrow, Bolt, Logout } from "@assets";
import { PermissionGuard } from "@components";
import { Permissions } from "@constants";
import { useSimulationCredits } from "@hooks";
import { User } from "@types";

const UserInfo: FC<{ user?: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [showLogout, setShowLogout] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { credits, limitReached, Creditpercentage } = useSimulationCredits();

  const ringColor = limitReached ? "#FE6F64" : "#5F99FC";

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
        className="flex border-gray-200 items-center cursor-pointer justify-end"
      >
        <div className="flex gap-2 items-center w-full">
          <div
            className="w-[40px] h-[40px] rounded-full p-[2px]"
            style={{
              background: `conic-gradient(${ringColor} ${Creditpercentage * 3.6}deg, #e5e7eb ${Creditpercentage * 3.6}deg)`,
            }}
          >
            <div className="bg-white rounded-full flex items-center justify-center w-full h-full">
              <AccountCircle className="text-gray-700 w-[28px] h-[28px]" />
            </div>
          </div>
          <div className="flex flex-col font-['IBM_Plex_Serif']">
            <div className="text-[16px] text-gray-800">{user?.name}</div>
            <div className="text-[12px] text-gray-500">{user?.email}</div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <Arrow
            className={`w-5 h-2 text-gray-600 transition-transform duration-300 ${
              showLogout ? "-rotate-90" : ""
            }`}
          />
        </div>
      </div>

      {showLogout && (
        <div className="absolute bottom-3 left-full bg-white border shadow-md rounded-md p-2 w-[240px] flex flex-col gap-3 font-['IBM_Plex_Sans']">
          <PermissionGuard requiredPermissions={[Permissions.VIEW_SIMULATION_CREDITS]}>
            <div className="flex items-center gap-2">
              <Bolt />
              <div>Credit usage</div>
            </div>

            <div className="flex justify-between items-center ">
              <div>
                <span className="font-semibold text-[18px] ">{credits?.consumedCredits ?? 0}</span>
                <span className="text-gray-500 text-[14px]">/{credits?.creditLimit ?? 0}</span>
              </div>
              <span>{credits?.creditLimit ? `${Creditpercentage}%` : "0%"}</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  limitReached ? "bg-red-500" : "bg-blue-600"
                }`}
                style={{ width: `${Creditpercentage}%` }}
              />
            </div>
            <div className="border-b" />
          </PermissionGuard>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-gray-700 hover:bg-gray-100 py-1 px-2 rounded justify-start w-full border-gray-200"
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
