import { FC } from "react";

import { Dialog } from "@mui/material";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { ImageUpload } from "@ally-ui-mono/ui-shared";
import { CloseIcon } from "@assets";

import { profileSettingsProps } from "./types";
import { Button, ButtonVariant } from "../button";

export const ProfileSettings: FC<profileSettingsProps> = ({
  isOpen,
  onClose,
  userData,
  formMethods,
  onButtonClick,
  getProfileUrl,
}) => {
  const { t } = useTranslation();

  const handleUploadFailure = () => {
    toast.error(t("profileSettings.uploadError"));
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
      <div className="h-[440px] w-[400px] flex flex-col p-5">
        <CloseIcon className="cursor-pointer absolute right-0 top-0" onClick={onClose} />
        <div className="flex flex-col gap-3">
          <div className="flex item-center justify-center text-2xl font-secondary">
            {t("profileSettings.title")}
          </div>
          <ImageUpload
            formMethods={formMethods}
            uploadId="profileImageUrl"
            uploadButtonName={t("profileSettings.uploadButton")}
            uploadTitle={t("profileSettings.uploadTitle")}
            onUpload={getProfileUrl}
            details={userData}
            onFailed={handleUploadFailure}
          />
          <div className="flex flex-col gap-5">
            <div className="flex flex-col">
              <label className="text-sm text-typography-900 cursor-pointer font-primary">
                {t("profileSettings.nameLabel")}
              </label>

              <input
                placeholder={userData?.name ?? ""}
                disabled
                className="border rounded-md px-2 py-2 outline-none text-base font-primary"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-typography-900 cursor-pointer font-primary">
                {t("profileSettings.emailLabel")}
              </label>
              <input
                placeholder={userData?.email ?? ""}
                disabled
                className="border rounded-md px-2 py-2 outline-none text-base font-primary"
              />
            </div>
          </div>
          <div className="w-full flex items-center justify-center gap-2 pt-4">
            <Button fullWidth onClick={onClose} variant={ButtonVariant.SECONDARY}>
              {t("profileSettings.cancel")}
            </Button>

            <Button fullWidth onClick={onButtonClick} variant={ButtonVariant.PRIMARY}>
              {t("profileSettings.done")}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
