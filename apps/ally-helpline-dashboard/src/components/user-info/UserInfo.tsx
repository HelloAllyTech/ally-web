import { FC, useEffect, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { CustomImage } from "@ally-ui-mono/ui-shared";
import { Ally, Arrow, Bolt, DataPolicy, Logout, ManageAccount, RedirectIcon } from "@assets";
import { AppTooltip, PermissionGuard } from "@components";
import {
  ADMIN_CONSOLE_PATH,
  ALLY_DATA_POLICY_URL,
  Permissions,
  TooltipLocation,
  hasInternalRole,
} from "@constants";
import { useSimulationCredits } from "@hooks";
import { User } from "@types";
import { openLinkInNewTab } from "@utils";

const UserInfo: FC<{
  user?: User;
  isExpanded?: boolean;
  onLogout: () => void;
  onProfileSettings: () => void;
  profileUrl?: string;
  name?: string;
}> = ({ user, isExpanded, onLogout, onProfileSettings, profileUrl, name }) => {
  const { t } = useTranslation();
  const [showLogout, setShowLogout] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { credits, limitReached, CreditPercentage } = useSimulationCredits();

  const hasPercentage = typeof CreditPercentage === "number" && CreditPercentage >= 0;
  const ringColor = limitReached ? "#FE6F64" : "#264D8E";

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
    <div className="relative w-full" ref={containerRef} data-testid="user-info">
      <div className="flex flex-col gap-3 w-full">
        <AppTooltip location={TooltipLocation.PROFILE_MENU}>
          <div
            data-testid="user-info-trigger"
            onClick={() => setShowLogout(prev => !prev)}
            className="flex border-gray-200 items-center cursor-pointer "
          >
            <div className="flex gap-2 items-center w-full">
              <div
                data-testid="user-info-avatar-ring"
                className={"w-[40px] h-[40px] rounded-full p-[2px]"}
                style={
                  hasPercentage
                    ? {
                        background: `conic-gradient(${ringColor} ${CreditPercentage * 3.6}deg, #e5e7eb ${CreditPercentage * 3.6}deg)`,
                      }
                    : undefined
                }
              >
                <div
                  className="bg-white rounded-full flex items-center justify-center w-full h-full overflow-hidden"
                  data-testid="user-info-avatar"
                >
                  <CustomImage
                    className="rounded-full object-cover"
                    fallbackClassName="flex items-center justify-center text-typography-600 bg-neutral-100 rounded-full object-cover w-full h-full"
                    fallbackText={name ? name?.slice(0, 1).toUpperCase() : "NA"}
                    src={profileUrl}
                    alt={t("user.profileAlt")}
                  />
                </div>
              </div>
              {isExpanded && (
                <div
                  className="flex flex-col font-primary max-w-[150px] overflow-hidden"
                  data-testid="user-info-details"
                >
                  <div
                    className="text-lg text-typography-800 truncate"
                    data-testid="user-info-name"
                  >
                    {user?.name}
                  </div>
                  <div
                    className="text-xs text-typography-800 truncate"
                    data-testid="user-info-email"
                  >
                    {user?.email}
                  </div>
                </div>
              )}
            </div>
            {isExpanded && (
              <div className="flex-shrink-0">
                <Arrow
                  data-testid="user-info-toggle-arrow"
                  className={`w-5 h-2 text-typography-800 transition-transform duration-300 ${
                    showLogout ? "-rotate-90" : ""
                  }`}
                />
              </div>
            )}
          </div>
        </AppTooltip>
        <div
          className={`border-[0.5px] flex items-center justify-center py-2  transition-all duration-200  rounded-md ${!isExpanded ? "h-10 w-10 p-1" : ""}`}
        >
          <Ally />
        </div>
      </div>
      {showLogout && (
        <div
          data-testid="user-info-dropdown"
          className={`absolute z-50 bottom-3  bg-white border shadow-md rounded-md p-2 w-[240px] flex flex-col gap-3 font-primary ${isExpanded ? "left-[240px]" : "left-[80px]"}`}
        >
          <PermissionGuard requiredPermissions={[Permissions.VIEW_SIMULATION_CREDITS]}>
            <div className="flex items-center gap-2" data-testid="user-info-credits-header">
              <Bolt data-testid="user-info-credits-icon" />
              <div>{t("user.creditUsage")}</div>
            </div>

            <div
              className="flex justify-between items-center "
              data-testid="user-info-credits-stats"
            >
              <div>
                <span className="font-semibold text-xl " data-testid="user-info-credits-consumed">
                  {credits?.consumedCredits ?? 0}
                </span>
                <span
                  className="text-typography-800 text-base"
                  data-testid="user-info-credits-limit"
                >
                  /{credits?.creditLimit ?? 0}
                </span>
              </div>
              <span data-testid="user-info-credits-percentage">
                {credits?.creditLimit ? `${CreditPercentage}%` : "0%"}
              </span>
            </div>

            <div
              className="w-full bg-gray-200 rounded-full h-2"
              data-testid="user-info-credits-bar-container"
            >
              <div
                data-testid="user-info-credits-bar"
                className={`h-2 rounded-full transition-all duration-300 ${
                  limitReached ? "bg-red-500" : "bg-[#264D8E]"
                }`}
                style={{ width: `${CreditPercentage}%` }}
              />
            </div>
            <div className="border-b" data-testid="user-info-divider" />
          </PermissionGuard>
          <div className="flex flex-col items-center justify-center text-base">
            {/* Ally staff only. A plain link, not navigate(): the admin console
                is a separate app served under /admin on this origin, so it
                needs a full page load rather than a client-side route change. */}
            {hasInternalRole(user) && (
              <a
                data-testid="user-info-admin-console-link"
                href={ADMIN_CONSOLE_PATH}
                className="flex items-center gap-2 text-typography-700 hover:bg-gray-100 py-1 px-2 rounded justify-start w-full border-gray-200"
              >
                <RedirectIcon className="w-4 h-4" />
                {t("user.adminConsole")}
              </a>
            )}
            <button
              onClick={onProfileSettings}
              className="flex items-center gap-2 text-typography-700 hover:bg-gray-100 py-1 px-2 rounded justify-start w-full border-gray-200"
            >
              <ManageAccount />
              {t("profile.settings.title")}
            </button>
            <button
              onClick={() => openLinkInNewTab(ALLY_DATA_POLICY_URL)}
              className="flex items-center gap-3 text-typography-700 hover:bg-gray-100 p-1  rounded justify-start w-full border-gray-200"
            >
              <DataPolicy />
              {t("user.dataPolicy")}
            </button>
            <button></button>
            <AppTooltip location={TooltipLocation.LOGOUT_BUTTON}>
              <button
                data-testid="user-info-logout-button"
                onClick={onLogout}
                className="flex items-center gap-2 text-typography-700 hover:bg-gray-100 py-1 px-2 rounded justify-start w-full border-gray-200"
              >
                <Logout className="w-4 h-4" data-testid="user-info-logout-icon" />
                {t("user.logout")}
              </button>
            </AppTooltip>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInfo;
