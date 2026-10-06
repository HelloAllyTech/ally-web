import { FC, useEffect, useId, useState } from "react";

import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useGetHelplineTeamQuery, useUpdateHelplineTeamMemberMutation } from "@api/helpline";
import { Permissions } from "@constants/permissions";
import { useUser } from "@hooks/useUser";
import type { TeamMemberDto, UpdateTeamMemberBody } from "@types";
import { hasPermissions } from "@utils/permission";

import { WithTooltip } from "./components/HelpTip";
import { EmptyBox, LoadFailed } from "./components/MonitorParts";

const SEARCH_DEBOUNCE_MS = 300;

const useDebounced = (value: string, delayMs: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
};

/** An on/off switch with its own visible label — the row's name is part of its accessible name. */
const Switch: FC<{
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  testId?: string;
}> = ({ checked, label, disabled, onChange, testId }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    data-testid={testId}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-60 ${
      checked ? "bg-primary-500" : "bg-border-dark"
    }`}
  >
    <span
      aria-hidden="true"
      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-5" : "translate-x-0.5"
      }`}
    />
  </button>
);

const MemberRow: FC<{
  member: TeamMemberDto;
  onToggle: (member: TeamMemberDto, next: UpdateTeamMemberBody) => void;
}> = ({ member, onToggle }) => {
  const { t } = useTranslation();
  const listener = member.isListener;
  const supervisor = member.isSupervisor;
  const adminHint = member.isAdmin ? t("helplineWorkspace.team.adminHint") : null;
  // Supervisor already includes everything a listener can do, so Listener
  // reads on (and fixed) while Supervisor is on.
  const listenerViaSupervisor = !member.isAdmin && supervisor;

  return (
    <li
      className="flex flex-col gap-3 rounded-xl border border-border-light bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid={`team-row-${member.userId}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-primary text-base font-medium text-typography-900">
            {member.name || member.email}
          </span>
          {member.isAdmin && (
            <span className="inline-flex items-center rounded-full bg-status-sandBg px-2 py-0.5 font-primary text-xs text-status-sandFg">
              {t("helplineWorkspace.team.adminChip")}
            </span>
          )}
        </div>
        {member.name && (
          <p className="truncate font-primary text-sm text-typography-700">{member.email}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-5">
        <WithTooltip
          label={
            adminHint ??
            (listenerViaSupervisor ? t("helplineWorkspace.team.listenerViaSupervisor") : null)
          }
        >
          <label className="inline-flex items-center gap-2 font-primary text-sm text-typography-900">
            <Switch
              checked={member.isAdmin || listener || supervisor}
              disabled={member.isAdmin || supervisor}
              label={t("helplineWorkspace.team.listenerFor", { name: member.name || member.email })}
              onChange={next => onToggle(member, { listener: next, supervisor })}
              testId={`team-listener-${member.userId}`}
            />
            {t("helplineWorkspace.team.listener")}
          </label>
        </WithTooltip>
        <WithTooltip label={adminHint}>
          <label className="inline-flex items-center gap-2 font-primary text-sm text-typography-900">
            <Switch
              checked={member.isAdmin || supervisor}
              disabled={member.isAdmin}
              label={t("helplineWorkspace.team.supervisorFor", {
                name: member.name || member.email,
              })}
              onChange={next => onToggle(member, { listener, supervisor: next })}
              testId={`team-supervisor-${member.userId}`}
            />
            {t("helplineWorkspace.team.supervisor")}
          </label>
        </WithTooltip>
      </div>
    </li>
  );
};

/**
 * `/helpline/team` — tenant admins (`edit:helpline:team`) decide who can take
 * chats (Listener) and who also supervises (Supervisor). Exactly those two
 * groups; tenant admins are supervisors by role, so their switches are fixed.
 * Changes apply at once, optimistically, and roll back with a message if the
 * server refuses.
 */
export const HelplineTeam: FC = () => {
  const { t } = useTranslation();
  const { permissions } = useUser();
  const searchId = useId();
  const canEdit = hasPermissions(permissions, Permissions.EDIT_HELPLINE_TEAM);
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search, SEARCH_DEBOUNCE_MS);
  const { data, isLoading, isFetching, isError, refetch } = useGetHelplineTeamQuery(debounced, {
    skip: !canEdit,
  });
  const [updateMember] = useUpdateHelplineTeamMemberMutation();

  if (!canEdit) {
    return (
      <div className="flex h-full items-center justify-center p-6" role="status">
        <p className="max-w-md text-center font-primary text-base text-typography-800">
          {t("helplineWorkspace.team.noAccess")}
        </p>
      </div>
    );
  }

  // The switch moves at once (the mutation patches the cache optimistically)
  // and moves back, with a message, if the server refuses.
  const onToggle = async (member: TeamMemberDto, next: UpdateTeamMemberBody) => {
    try {
      await updateMember({ userId: member.userId, ...next }).unwrap();
    } catch {
      toast.error(t("helplineWorkspace.team.failed", { name: member.name || member.email }));
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="h-full overflow-y-auto" data-testid="helpline-team">
      <div className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-5 md:px-6">
        <div>
          <h1 className="font-secondary text-2xl text-typography-900">
            {t("helplineWorkspace.team.title")}
          </h1>
        </div>

        <section
          aria-label={t("helplineWorkspace.team.rolesLabel")}
          className="grid gap-3 rounded-xl bg-background-secondary p-4 font-primary text-sm text-typography-900 sm:grid-cols-2"
          data-testid="team-explainer"
        >
          <div>
            <h2 className="font-medium">{t("helplineWorkspace.team.listener")}</h2>
            <p className="mt-0.5 text-typography-800">
              {t("helplineWorkspace.team.listenerExplainer")}
            </p>
          </div>
          <div>
            <h2 className="font-medium">{t("helplineWorkspace.team.supervisor")}</h2>
            <p className="mt-0.5 text-typography-800">
              {t("helplineWorkspace.team.supervisorExplainer")}
            </p>
          </div>
          <p className="text-xs text-typography-700 sm:col-span-2">
            {t("helplineWorkspace.team.lagNote")}
          </p>
        </section>

        <div className="flex flex-col gap-1">
          <label
            htmlFor={searchId}
            className="font-primary text-xs font-medium text-typography-800"
          >
            {t("helplineWorkspace.team.searchLabel")}
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-border-medium bg-white px-3 focus-within:ring-2 focus-within:ring-primary-500">
            <Search aria-hidden="true" className="h-4 w-4 text-typography-600" />
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t("helplineWorkspace.team.searchPlaceholder")}
              className="min-h-[40px] w-full bg-transparent font-primary text-sm text-typography-900 outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <p role="status" className="font-primary text-sm text-typography-700">
            {t("helplineWorkspace.gate.loading")}
          </p>
        ) : isError ? (
          <LoadFailed
            message={t("helplineWorkspace.team.loadFailed")}
            onRetry={() => void refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyBox testId="team-empty">
            {debounced.trim()
              ? t("helplineWorkspace.team.noMatch", { search: debounced.trim() })
              : t("helplineWorkspace.team.empty")}
          </EmptyBox>
        ) : (
          <ul className="flex flex-col gap-2" aria-busy={isFetching} data-testid="team-list">
            {items.map(member => (
              <MemberRow
                key={member.userId}
                member={member}
                onToggle={(target, next) => void onToggle(target, next)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HelplineTeam;
