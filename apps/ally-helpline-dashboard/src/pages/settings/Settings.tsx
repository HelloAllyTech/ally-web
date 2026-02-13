// File: apps/ally-helpline-dashboard/src/pages/settings/Settings.tsx
import { ComingSoon } from "@assets";
import { FallbackUI } from "@components";
import { useTranslation } from "react-i18next";

export const Settings = () => {
  const { t } = useTranslation();
  return (
    <div className="h-[90vh] flex items-center justify-center">
      <FallbackUI
        icon={<ComingSoon />}
        mainMessage={t("settings.comingSoon.title")}
        description={t("settings.comingSoon.description")}
      />
    </div>
  );
};
