import { FC, useEffect, useRef, useState } from "react";

import { AccountCircle, Arrow, Bolt, Logout } from "@assets";
import { PermissionGuard } from "@components";
import { Permissions } from "@constants";
import { useSimulationCredits } from "@hooks";
import { User } from "@types";

const UserInfo: FC<{ user?: User; isExpanded?: boolean; onLogout: () => void }> = ({
  user,
  isExpanded,
  onLogout,
}) => {
  const [showLogout, setShowLogout] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { credits, limitReached, CreditPercentage } = useSimulationCredits();

  const hasPercentage = typeof CreditPercentage === "number" && CreditPercentage >= 0;
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
            className={"w-[40px] h-[40px] rounded-full p-[2px]"}
            style={
              hasPercentage
                ? {
                    background: `conic-gradient(${ringColor} ${CreditPercentage * 3.6}deg, #e5e7eb ${CreditPercentage * 3.6}deg)`,
                  }
                : undefined
            }
          >
            <div className="bg-white rounded-full flex items-center justify-center w-full h-full">
              <AccountCircle className="text-typography-700 w-[28px] h-[28px]" />
            </div>
          </div>
          {isExpanded && (
            <div className="flex flex-col font-primary">
              <div className="text-lg text-typography-800">{user?.name}</div>
              <div className="text-xs text-typography-800">{user?.email}</div>
            </div>
          )}
        </div>
        {isExpanded && (
          <div className="flex-shrink-0">
            <Arrow
              className={`w-5 h-2 text-typography-800 transition-transform duration-300 ${
                showLogout ? "-rotate-90" : ""
              }`}
            />
          </div>
        )}
      </div>

      {showLogout && (
        <div
          className={`absolute z-10 bottom-3  bg-white border shadow-md rounded-md p-2 w-[240px] flex flex-col gap-3 font-primary ${isExpanded ? "left-[240px]" : "left-[80px]"}`}
        >
          <PermissionGuard requiredPermissions={[Permissions.VIEW_SIMULATION_CREDITS]}>
            <div className="flex items-center gap-2">
              <Bolt />
              <div>Credit usage</div>
            </div>

            <div className="flex justify-between items-center ">
              <div>
                <span className="font-semibold text-xl ">{credits?.consumedCredits ?? 0}</span>
                <span className="text-typography-800 text-base">/{credits?.creditLimit ?? 0}</span>
              </div>
              <span>{credits?.creditLimit ? `${CreditPercentage}%` : "0%"}</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  limitReached ? "bg-red-500" : "bg-blue-600"
                }`}
                style={{ width: `${CreditPercentage}%` }}
              />
            </div>
            <div className="border-b" />
          </PermissionGuard>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-typography-700 hover:bg-gray-100 py-1 px-2 rounded justify-start w-full border-gray-200"
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
