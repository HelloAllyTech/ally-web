import { FC } from "react";

import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { Permissions, ROUTES } from "@constants";
import { useUser } from "@hooks/useUser";
import { hasPermissions } from "@utils/permission";

import { ConnectionPill } from "./HelplineBadges";
import { useHelplineRealtime } from "../realtime/HelplineRealtimeProvider";

interface SubNavItem {
  key: string;
  path: string;
  labelKey: string;
  /** Shown only to holders of this permission. */
  permission?: Permissions;
  /** False until the page exists; flips when the later pass lands it. */
  available: boolean;
  end?: boolean;
}

/**
 * Lobby / History now. Monitor (supervisors), QA and Team (tenant admins) have
 * their slots here but stay hidden until their pages exist — a tab that leads
 * nowhere is worse than no tab.
 */
const SUB_NAV: SubNavItem[] = [
  {
    key: "lobby",
    path: ROUTES.HELPLINE,
    labelKey: "helplineWorkspace.subnav.lobby",
    available: true,
    end: true,
  },
  {
    key: "history",
    path: ROUTES.HELPLINE_HISTORY,
    labelKey: "helplineWorkspace.subnav.history",
    available: true,
  },
  {
    key: "monitor",
    path: "/helpline/monitor",
    labelKey: "helplineWorkspace.subnav.monitor",
    permission: Permissions.VIEW_HELPLINE_MONITOR,
    available: false,
  },
  {
    key: "qa",
    path: "/helpline/qa",
    labelKey: "helplineWorkspace.subnav.qa",
    permission: Permissions.VIEW_HELPLINE_QA,
    available: false,
  },
  {
    key: "team",
    path: "/helpline/team",
    labelKey: "helplineWorkspace.subnav.team",
    permission: Permissions.EDIT_HELPLINE_TEAM,
    available: false,
  },
];

export const HelplineSubNav: FC = () => {
  const { t } = useTranslation();
  const { permissions } = useUser();
  const { connection } = useHelplineRealtime();
  const items = SUB_NAV.filter(
    item => item.available && (!item.permission || hasPermissions(permissions, item.permission)),
  );

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-light bg-white px-4 md:px-6">
      <nav aria-label={t("helplineWorkspace.subnav.label")} className="flex gap-1">
        {items.map(item => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `inline-flex min-h-[44px] items-center border-b-2 px-3 font-primary text-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                isActive
                  ? "border-primary-500 font-medium text-typography-900"
                  : "border-transparent text-typography-700 hover:text-typography-900"
              }`
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
      <ConnectionPill status={connection} />
    </div>
  );
};
