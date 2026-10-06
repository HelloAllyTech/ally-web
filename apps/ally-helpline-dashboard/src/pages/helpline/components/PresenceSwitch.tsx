import { FC, useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useSetHelplinePresenceMutation } from "@api/helpline";
import type { HelplineMeDto } from "@types";

import { HelpTip } from "./HelpTip";
import { notificationPermission, requestNotificationPermission } from "../alerts";
import { effectiveCapacity } from "../utils";

type Choice = "AVAILABLE" | "AWAY";

/**
 * Available / Away as a two-option radio group (clearer than a toggle whose
 * "off" has to be guessed), with the listener's load beside it.
 *
 * The selection is local state that wins over the server value until the
 * server agrees, and rolls back on failure — never driven by a cache patch.
 * Turning Available on is the user gesture that asks for notification
 * permission, once, and respects a "no".
 */
export const PresenceSwitch: FC<{ me: HelplineMeDto; canEdit: boolean }> = ({ me, canEdit }) => {
  const { t } = useTranslation();
  const [setPresence, { isLoading }] = useSetHelplinePresenceMutation();
  const [pending, setPending] = useState<Choice | null>(null);
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);
  const serverChoice: Choice = me.presence === "AVAILABLE" ? "AVAILABLE" : "AWAY";
  const current = pending ?? serverChoice;

  useEffect(() => {
    if (pending && pending === serverChoice) setPending(null);
  }, [pending, serverChoice]);

  const choose = async (next: Choice) => {
    if (!canEdit || next === current || isLoading) return;
    setPending(next);
    const permission =
      next === "AVAILABLE" && me.profile.notificationsEnabled
        ? requestNotificationPermission()
        : Promise.resolve(notificationPermission());
    try {
      await setPresence({ status: next }).unwrap();
    } catch {
      setPending(null);
      toast.error(t("helplineWorkspace.presence.failed"));
      return;
    }
    if (next === "AVAILABLE" && me.profile.notificationsEnabled) {
      setNotificationsBlocked((await permission) === "denied");
    }
  };

  const options: { value: Choice; label: string }[] = [
    { value: "AVAILABLE", label: t("helplineWorkspace.presence.available") },
    { value: "AWAY", label: t("helplineWorkspace.presence.away") },
  ];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-label={t("helplineWorkspace.presence.label")}
          className="inline-flex rounded-full border border-border-medium bg-white p-0.5"
        >
          {options.map(option => {
            const selected = current === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!canEdit}
                onClick={() => void choose(option.value)}
                className={`inline-flex min-h-[36px] items-center gap-2 rounded-full px-4 font-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-default ${
                  selected
                    ? option.value === "AVAILABLE"
                      ? "bg-status-sageBg font-medium text-status-sageFg"
                      : "bg-background-tertiary font-medium text-typography-900"
                    : "text-typography-700 hover:text-typography-900"
                }`}
              >
                {option.value === "AVAILABLE" && (
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${selected ? "bg-status-sageDot" : "bg-typography-400"}`}
                  />
                )}
                {option.label}
              </button>
            );
          })}
        </div>
        <HelpTip
          label={t("helplineWorkspace.presence.tooltip")}
          ariaLabel={t("helplineWorkspace.presence.label")}
        />
        <span className="font-primary text-sm text-typography-800" data-testid="listener-load">
          {t("helplineWorkspace.presence.load", {
            active: me.activeChatCount,
            count: effectiveCapacity(me),
          })}
        </span>
      </div>
      {notificationsBlocked && (
        <p className="font-primary text-xs text-typography-700">
          {t("helplineWorkspace.presence.notificationsBlocked")}
        </p>
      )}
    </div>
  );
};
