import { useEffect, useState, FunctionComponent } from "react";

import {
  useLazyGetDashboardUrlQuery,
  useLazyGetDashboardsQuery,
} from "@/api/analytics";
import { logger } from '@ally-ui-mono/ui-shared';

const OrgAnalytics: FunctionComponent = () => {

  const [getDashboardUrl] = useLazyGetDashboardUrlQuery();
  const [getDashboards, { data: dashboards }] = useLazyGetDashboardsQuery();

  const [dashboardUrls, setDashboardUrls] = useState<{ [id: string]: string }>(
    {}
  );

  useEffect(() => {
    getDashboards();
  }, []);

  useEffect(() => {
    if (dashboards) {
      dashboards.forEach(async ({ externalId }) => {
        triggerDashboardUrl(externalId);
      });
    }
  }, [dashboards]);

  const triggerDashboardUrl = async (dashboardId: string) => {
    try {
      const data = await getDashboardUrl({ dashboardId });
      setDashboardUrls((prev) => ({
        ...prev,
        [dashboardId]: data?.data?.url,
      }));
    } catch (error) {
      logger.info(`Error in triggerDashboardUrl: ${error}`);
    }
  };

  return (
    <div className="h-[90vh] w-full flex items-center justify-center">
      {Object.keys(dashboardUrls)?.map((id: string) => (
        <iframe
          key={id}
          title="Metabase dashboard"
          src={dashboardUrls[id]}
          width="100%"
          height="100%"
          // TODO: Handle error in a way that url is triggered only when token expiry is triggered
          onError={() => triggerDashboardUrl(id)}
        ></iframe>
      ))}
    </div>
  );
};

export default OrgAnalytics;
