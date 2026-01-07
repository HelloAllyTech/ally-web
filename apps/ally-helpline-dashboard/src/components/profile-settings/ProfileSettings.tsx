import { FC } from "react";

import { Dialog } from "@mui/material";

import { ImageUpload } from "@ally-ui-mono/ui-shared";
import { useDeleteProfileImageMutation, useGetProfileImageUrlMutation } from "@api";
import { CloseIcon } from "@assets";

import { profileSettingsProps } from "./types";
import { Button, ButtonVariant } from "../button";

export const ProfileSettings: FC<profileSettingsProps> = ({
  isOpen,
  onClose,
  userData,
  formMethods,
  onButtonClick,
}) => {
  const [getProfileUrl] = useGetProfileImageUrlMutation();
  const [deleteProfile] = useDeleteProfileImageMutation();

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
            Profile Settings
          </div>
          <ImageUpload
            formMethods={formMethods}
            uploadId="profileImageUrl"
            uploadButtonName="Upload Image"
            uploadTitle="Profile image"
            onUpload={getProfileUrl}
            onDelete={deleteProfile}
            details={userData}
          />
          <div className="flex flex-col gap-5">
            <div className="flex flex-col">
              <label className="text-sm text-typography-900 cursor-pointer font-primary">
                Name
              </label>

              <input
                value={userData?.name ?? ""}
                disabled
                className="border rounded-md px-2 py-2 outline-none text-base font-primary placeholder:text-typography-600"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-typography-900 cursor-pointer font-primary">
                Email
              </label>
              <input
                value={userData?.email ?? ""}
                disabled
                className="border rounded-md px-2 py-2 outline-none text-base font-primary placeholder:text-typography-600"
              />
            </div>
          </div>
          <div className="w-full flex items-center justify-center gap-2 pt-4">
            <Button fullWidth onClick={onClose} variant={ButtonVariant.SECONDARY}>
              Cancel
            </Button>

            <Button fullWidth onClick={onButtonClick} variant={ButtonVariant.PRIMARY}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
