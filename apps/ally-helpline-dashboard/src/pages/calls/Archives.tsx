import { FC, useState } from "react";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";

import { LeftArrow, Refresh } from "@assets";
import { ROUTES } from "@constants";
import { updateFilters } from "@reducer";
import { RootState } from "@store";
import { SessionType } from "@types";

import { ArchivesLogsTable } from "./components";
import { SessionUserGroup } from "./constants";

export const Archives: FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { filters } = useSelector((state: RootState) => state.calls);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Get sessionUserGroup from navigation state, default to MY_LOGS if not provided
  const sessionUserGroup =
    (location.state as { sessionUserGroup?: SessionUserGroup })?.sessionUserGroup ??
    SessionUserGroup.MY_LOGS;

  const handleRefresh = () => {
    dispatch(updateFilters({ ...filters, offset: 0 }));
    setRefreshKey(prev => prev + 1);
  };

  const handleGoBack = () => {
    navigate(ROUTES.SCRIBE_LOGS);
  };

  return (
    <div className="px-6 pb-6 h-full flex flex-col" data-testid="archives-page">
      <motion.div
        data-testid="archives-header"
        layout="position"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative mt-[10px] font-secondary"
      >
        <div
          className="sm:p-4 p-0 rounded-lg flex gap-4 sm:justify-between justify-start bg-transparent items-center"
          data-testid="archives-header-content"
        >
          <div
            className="z-10 text-typography-900 text-2xl font-[500] flex items-center gap-2"
            data-testid="archives-title"
          >
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center cursor-pointer hover:bg-neutral-100 rounded-full mr-2"
              onClick={handleGoBack}
              data-testid="archives-back-button"
              aria-label={t("calls.archives.backAria")}
            >
              <LeftArrow className="w-5 h-5" />
            </button>
            {t("calls.archives.title")}
            <Refresh
              data-testid="archives-refresh-button"
              className="w-6 h-6 cursor-pointer border-l-[0.5px] border-border pl-2"
              onClick={handleRefresh}
            />
          </div>
        </div>
      </motion.div>
      <div data-testid="archives-content">
        <ArchivesLogsTable
          sessionType={SessionType.CALL}
          className="max-h-[calc(100dvh-140px)]"
          refreshKey={refreshKey}
          sessionUserGroup={sessionUserGroup}
        />
      </div>
    </div>
  );
};
