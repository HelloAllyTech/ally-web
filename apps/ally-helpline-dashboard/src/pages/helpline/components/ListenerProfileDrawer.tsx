import { FC, FormEvent, useEffect, useId, useState } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useUpdateHelplineProfileMutation } from "@api/helpline";
import Drawer from "@components/drawer";
import { HELPLINE_LIMITS } from "@constants/helpline";
import type { HelplineMeDto } from "@types";

import { languageName } from "../../helpline-talk/components/ConsentScreen";

interface ListenerProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  me: HelplineMeDto;
  canEdit: boolean;
}

const inputClass =
  "min-h-[40px] rounded-lg border border-border-medium bg-white px-3 font-primary text-base text-typography-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500";

/** The alias talkers see, how many chats at once (≤ the org cap), languages, alerts. */
export const ListenerProfileDrawer: FC<ListenerProfileDrawerProps> = ({
  open,
  onClose,
  me,
  canEdit,
}) => {
  const { t } = useTranslation();
  const [updateProfile, { isLoading }] = useUpdateHelplineProfileMutation();
  const [displayName, setDisplayName] = useState(me.profile.displayName);
  const [maxChats, setMaxChats] = useState(me.profile.maxConcurrentChats);
  const [languages, setLanguages] = useState<string[]>(me.profile.languages);
  const [notifications, setNotifications] = useState(me.profile.notificationsEnabled);
  const [aliasError, setAliasError] = useState(false);
  const aliasId = useId();
  const aliasHintId = useId();
  const maxId = useId();
  const maxHintId = useId();
  const orgCap = Math.max(1, me.orgMaxConcurrentPerListener);
  const offered = me.settings.languages.length ? me.settings.languages : me.profile.languages;

  useEffect(() => {
    if (!open) return;
    setDisplayName(me.profile.displayName);
    setMaxChats(Math.min(me.profile.maxConcurrentChats, orgCap));
    setLanguages(me.profile.languages);
    setNotifications(me.profile.notificationsEnabled);
    setAliasError(false);
  }, [open, me.profile, orgCap]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const alias = displayName.trim();
    if (!alias) {
      setAliasError(true);
      return;
    }
    try {
      await updateProfile({
        displayName: alias,
        maxConcurrentChats: Math.min(Math.max(1, maxChats), orgCap),
        languages,
        notificationsEnabled: notifications,
      }).unwrap();
      toast.success(t("helplineWorkspace.profile.saved"));
      onClose();
    } catch {
      toast.error(t("helplineWorkspace.profile.failed"));
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={t("helplineWorkspace.profile.title")}>
      <form onSubmit={submit} className="flex flex-col gap-5 p-1 font-primary">
        <div className="flex flex-col gap-1">
          <label htmlFor={aliasId} className="text-sm font-medium text-typography-900">
            {t("helplineWorkspace.profile.aliasLabel")}
          </label>
          <input
            id={aliasId}
            value={displayName}
            maxLength={HELPLINE_LIMITS.DISPLAY_NAME_MAX}
            disabled={!canEdit}
            aria-invalid={aliasError}
            aria-describedby={aliasHintId}
            onChange={event => {
              setDisplayName(event.target.value);
              setAliasError(false);
            }}
            className={inputClass}
          />
          <p
            id={aliasHintId}
            className={`text-xs ${aliasError ? "text-destructive-700" : "text-typography-700"}`}
          >
            {aliasError
              ? t("helplineWorkspace.profile.aliasRequired")
              : t("helplineWorkspace.profile.aliasHint")}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={maxId} className="text-sm font-medium text-typography-900">
            {t("helplineWorkspace.profile.maxLabel")}
          </label>
          <input
            id={maxId}
            type="number"
            min={1}
            max={orgCap}
            value={maxChats}
            disabled={!canEdit}
            aria-describedby={maxHintId}
            onChange={event => setMaxChats(Number(event.target.value) || 1)}
            className={`${inputClass} w-24`}
          />
          <p id={maxHintId} className="text-xs text-typography-700">
            {t("helplineWorkspace.profile.maxHint", { max: orgCap })}
          </p>
        </div>

        {offered.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-typography-900">
              {t("helplineWorkspace.profile.languagesLabel")}
            </legend>
            <div className="flex flex-wrap gap-3">
              {offered.map(code => (
                <label
                  key={code}
                  className="inline-flex items-center gap-2 text-base text-typography-900"
                >
                  <input
                    type="checkbox"
                    checked={languages.includes(code)}
                    disabled={!canEdit}
                    onChange={event =>
                      setLanguages(current =>
                        event.target.checked
                          ? [...current, code]
                          : current.filter(item => item !== code),
                      )
                    }
                    className="h-4 w-4"
                  />
                  <span lang={code}>{languageName(code)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={notifications}
            disabled={!canEdit}
            onChange={event => setNotifications(event.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="block text-base text-typography-900">
              {t("helplineWorkspace.profile.notificationsLabel")}
            </span>
            <span className="block text-xs text-typography-700">
              {t("helplineWorkspace.profile.notificationsHint")}
            </span>
          </span>
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canEdit || isLoading}
            className="min-h-[40px] rounded-full bg-primary-500 px-5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {isLoading
              ? t("helplineWorkspace.profile.saving")
              : t("helplineWorkspace.profile.save")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] rounded-full border border-border-medium px-5 text-sm text-typography-900 hover:bg-background-secondary"
          >
            {t("helplineWorkspace.profile.cancel")}
          </button>
        </div>
      </form>
    </Drawer>
  );
};
