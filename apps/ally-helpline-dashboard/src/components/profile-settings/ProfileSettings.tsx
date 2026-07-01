import { FC } from "react";

import { Dialog } from "@mui/material";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ImageUpload } from "@ally-ui-mono/ui-shared";
import { CloseIcon } from "@assets";
import { THEME_META, UI_THEMES } from "@theme/themes";

import { profileSettingsProps } from "./types";
import { Button, ButtonVariant } from "../button";

export const ProfileSettings: FC<profileSettingsProps> = ({
  isOpen,
  onClose,
  userData,
  formMethods,
  onButtonClick,
  getProfileUrl,
  showThemePicker = false,
  selectedTheme,
  onSelectTheme,
}) => {
  const { t } = useTranslation();

  const handleUploadFailure = () => {
    toast.error(t("profile.settings.error_image_size"));
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        style: {
          borderRadius: "8px",
        },
      }}
    >
      <div
        className={`w-[400px] flex flex-col p-5 ${
          showThemePicker ? "min-h-[440px] max-h-[85vh] overflow-y-auto" : "h-[440px]"
        }`}
      >
        <CloseIcon className="cursor-pointer absolute right-0 top-0" onClick={onClose} />
        <div className="flex flex-col gap-3">
          <div className="flex item-center justify-center text-2xl font-secondary">
            {t("profile.settings.title")}
          </div>
          <ImageUpload
            formMethods={formMethods}
            uploadId="profileImageUrl"
            uploadButtonName={t("profile.settings.upload_image")}
            uploadTitle={t("profile.settings.profile_image")}
            uploadHint={t("profile.settings.upload_hint")}
            onUpload={getProfileUrl}
            details={userData}
            onFailed={handleUploadFailure}
          />
          <div className="flex flex-col gap-5">
            <div className="flex flex-col">
              <label className="text-sm text-typography-900 cursor-pointer font-primary">
                {t("profile.settings.name")}
              </label>

              <input
                placeholder={userData?.name ?? ""}
                disabled
                className="border rounded-md px-2 py-2 outline-none text-base font-primary"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-typography-900 cursor-pointer font-primary">
                {t("profile.settings.email")}
              </label>
              <input
                placeholder={userData?.email ?? ""}
                disabled
                className="border rounded-md px-2 py-2 outline-none text-base font-primary"
              />
            </div>
            {showThemePicker && (
              <div className="flex flex-col gap-2">
                <label className="text-sm text-typography-900 font-primary">
                  {t("profile.settings.appearance.title")}
                </label>
                <div className="flex gap-3" role="radiogroup">
                  {UI_THEMES.map(themeId => {
                    const isSelected = selectedTheme === themeId;
                    return (
                      <button
                        key={themeId}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={t(THEME_META[themeId].labelKey)}
                        title={t(THEME_META[themeId].labelKey)}
                        onClick={() => onSelectTheme?.(themeId)}
                        className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-105 ${
                          isSelected ? "border-primary-500" : "border-border-light"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${THEME_META[themeId].swatch.join(", ")})`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="w-full flex items-center justify-center gap-2 pt-4">
            <Button fullWidth onClick={onClose} variant={ButtonVariant.SECONDARY}>
              {t("profile.settings.cancel")}
            </Button>

            <Button fullWidth onClick={onButtonClick} variant={ButtonVariant.PRIMARY}>
              {t("profile.settings.done")}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
