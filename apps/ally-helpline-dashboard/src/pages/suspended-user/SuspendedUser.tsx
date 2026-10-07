import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { SuspendedUserIcon } from "@assets";

export const SuspendedUser = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const GoToLogin = () => {
    navigate("/");
  };

  return (
    <div className="flex  flex-col justify-center  items-center h-dvh gap-2 px-4">
      <div className="border rounded-lg px-6 py-8 sm:px-16 sm:py-10 flex flex-col justify-center items-center gap-2 max-w-full">
        <SuspendedUserIcon />
        <div className="text-2xl font-secondary text-center">{t("suspended.title")}</div>
        <div className="flex flex-col text-center font-primary">
          <div>{t("suspended.description.line1")}</div>
          <div>{t("suspended.description.line2")}</div>
        </div>

        <button
          type="button"
          className="border border-secondary-700 rounded-full px-5 py-3 sm:py-2 font-tertiary mt-8"
          onClick={GoToLogin}
        >
          {t("suspended.goToLogin")}
        </button>
      </div>
    </div>
  );
};
