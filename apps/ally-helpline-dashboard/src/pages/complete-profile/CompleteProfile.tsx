import { FC, useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useCompleteProfileMutation } from "@api";
import { Button, TextField } from "@components";
import { ROUTES } from "@constants";
import { useUser } from "@hooks";

/**
 * First-login gate for accounts created in bulk by an admin (no name yet).
 * The user fills in their name before entering the app; completing it flips
 * profileCompleted server-side and a user refetch clears the gate.
 */
export const CompleteProfile: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { checkAuth } = useUser();
  const [name, setName] = useState("");
  const [completeProfile, { isLoading }] = useCompleteProfileMutation();

  const isNameValid = name.trim().length > 0;

  const handleSubmit = async () => {
    if (!isNameValid) return;
    try {
      await completeProfile({ name: name.trim() }).unwrap();
      // Re-run the full auth flow (refetches user + permissions and updates the
      // store) so profileCompleted flips true and the gate clears. Mirrors the
      // post-login flow.
      await checkAuth();
      // Land on HOME; the index route redirects to the role-based landing page
      // via getLandingPageByRole().
      navigate(ROUTES.HOME, { replace: true });
    } catch {
      toast.error(t("completeProfile.error"));
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-dvh gap-2">
      <div className="border rounded-lg px-16 py-10 flex flex-col items-center gap-4 w-[420px] max-w-[90vw]">
        <div className="text-2xl font-secondary">{t("completeProfile.title")}</div>
        <div className="text-center font-primary text-typography-700 text-sm">
          {t("completeProfile.subtitle")}
        </div>

        <form
          className="flex flex-col gap-4 w-full mt-2"
          onSubmit={e => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <TextField
            label={t("completeProfile.nameLabel")}
            placeholder={t("completeProfile.namePlaceholder")}
            fieldSize="large"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <Button type="submit" fullWidth disabled={!isNameValid || isLoading}>
            {t("completeProfile.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
};
