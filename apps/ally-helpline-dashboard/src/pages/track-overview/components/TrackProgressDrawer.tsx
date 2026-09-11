import { FC } from "react";

import { useTranslation } from "react-i18next";

import { useGetLearnTrackProgressQuery } from "@api";
import { Drawer } from "@components";
import { TrackProgressBody } from "@src/pages/track-progress/components/TrackProgressBody";

interface TrackProgressDrawerProps {
  trackId: string;
  onClose: () => void;
  onContinuePress: () => void;
}

/**
 * In-context view of a course's progress + consolidated feedback, opened by
 * clicking the progress bar on Track Overview. Shares TrackProgressBody with
 * the standalone /track/:trackId/progress page — same content, different
 * chrome (a drawer's own title bar instead of a page breadcrumb).
 */
export const TrackProgressDrawer: FC<TrackProgressDrawerProps> = ({
  trackId,
  onClose,
  onContinuePress,
}) => {
  const { t } = useTranslation();

  const {
    data: dashboard,
    isLoading,
    isError,
  } = useGetLearnTrackProgressQuery({ trackId }, { skip: !trackId });

  return (
    <Drawer
      open
      onClose={onClose}
      title={t("tracks2.progressDashboard.title")}
      drawerClassName="w-[38vw] md:min-w-[420px] max-w-[520px]"
      bodyClassName="h-full overflow-y-auto"
    >
      <div className="px-4 pb-8 sm:px-6">
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-500" />
          </div>
        )}

        {!isLoading && (isError || !dashboard) && (
          <div className="py-16 text-center text-sm text-typography-700">
            {t("tracks2.progressDashboard.notFound")}
          </div>
        )}

        {!isLoading && dashboard && (
          <TrackProgressBody dashboard={dashboard} onContinuePress={onContinuePress} />
        )}
      </div>
    </Drawer>
  );
};
