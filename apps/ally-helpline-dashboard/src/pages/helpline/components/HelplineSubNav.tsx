import { FC } from "react";

import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

import { Permissions, ROUTES } from "@constants";
import { useUser } from "@hooks/useUser";
import { hasPermissions } from "@utils/permission";

import { ConnectionPill } from "./HelplineBadges";
import { useHelplineAccess } from "../HelplineAccess";
import { useHelplineRealtime } from "../realtime/HelplineRealtimeProvider";

interface SubNavItem {
  key: string;
  path: string;
  labelKey: string;
  /** Shown only to holders of this permission. */
  permission?: Permissions;
  /** A different label for holders of this permission (QA: "Quality" vs "My feedback"). */
  labelFor?: { permission: Permissions; labelKey: string };
  end?: boolean;
  /** Still shown while the helpline is switched off and only open chats are reachable. */
  whileRestricted?: boolean;
}

/**
 * Lobby and History for everyone in the workspace; Monitor for supervisors;
 * QA for everyone — supervisors review every chat ("Quality"), a listener sees
 * their own ("My feedback"); Team for tenant admins.
 */
const SUB_NAV: SubNavItem[] = [
  {
    key: "lobby",
    path: ROUTES.HELPLINE,
    labelKey: "helplineWorkspace.subnav.lobby",
    end: true,
    whileRestricted: true,
  },
  {
    key: "history",
    path: ROUTES.HELPLINE_HISTORY,
    labelKey: "helplineWorkspace.subnav.history",
  },
  {
    key: "monitor",
    path: ROUTES.HELPLINE_MONITOR,
    labelKey: "helplineWorkspace.subnav.monitor",
    permission: Permissions.VIEW_HELPLINE_MONITOR,
  },
  {
    key: "qa",
    path: ROUTES.HELPLINE_QA,
    labelKey: "helplineWorkspace.subnav.myFeedback",
    labelFor: { permission: Permissions.VIEW_HELPLINE_QA, labelKey: "helplineWorkspace.subnav.qa" },
  },
  {
    key: "team",
    path: ROUTES.HELPLINE_TEAM,
    labelKey: "helplineWorkspace.subnav.team",
    permission: Permissions.EDIT_HELPLINE_TEAM,
  },
];

export const HelplineSubNav: FC = () => {
  const { t } = useTranslation();
  const { permissions } = useUser();
  const { connection } = useHelplineRealtime();
  const { restricted } = useHelplineAccess();
  const items = SUB_NAV.filter(
    item =>
      (!restricted || item.whileRestricted) &&
      (!item.permission || hasPermissions(permissions, item.permission)),
  );
  const labelOf = (item: SubNavItem) =>
    item.labelFor && hasPermissions(permissions, item.labelFor.permission)
      ? item.labelFor.labelKey
      : item.labelKey;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border-light bg-white px-4 md:px-6">
      <nav
        aria-label={t("helplineWorkspace.subnav.label")}
        className="-mb-px flex gap-1 overflow-x-auto"
      >
        {items.map(item => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `inline-flex min-h-[44px] items-center whitespace-nowrap border-b-2 px-3 font-primary text-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                isActive
                  ? "border-primary-500 font-medium text-typography-900"
                  : "border-transparent text-typography-700 hover:text-typography-900"
              }`
            }
          >
            {t(labelOf(item))}
          </NavLink>
        ))}
      </nav>
      <ConnectionPill status={connection} />
    </div>
  );
};
