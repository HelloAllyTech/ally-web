import { FC } from "react";

import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ComposedModal, ModalBody, ModalFooter, ImageUpload } from "@ally-ui-mono/ui-shared";
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
    toast.error(t("profile.settings.error_image_size"));
  };

  return (
    <ComposedModal open={isOpen} onClose={onClose} size="sm">
      <ModalBody className="flex flex-col p-5">
        <CloseIcon className="cursor-pointer absolute right-4 top-4 z-10" onClick={onClose} />
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
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="w-full flex items-center justify-center gap-2">
          <Button fullWidth onClick={onClose} variant={ButtonVariant.SECONDARY}>
            {t("profile.settings.cancel")}
          </Button>

          <Button fullWidth onClick={onButtonClick} variant={ButtonVariant.PRIMARY}>
            {t("profile.settings.done")}
          </Button>
        </div>
      </ModalFooter>
    </ComposedModal>
  );
};
