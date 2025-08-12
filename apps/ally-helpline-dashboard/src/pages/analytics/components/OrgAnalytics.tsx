import { useEffect, useState, FunctionComponent } from "react";

import { logger } from "@ally-ui-mono/ui-shared";
import { useLazyGetDashboardUrlQuery, useLazyGetDashboardsQuery } from "@api";

const OrgAnalytics: FunctionComponent = () => {
  const [getDashboardUrl] = useLazyGetDashboardUrlQuery();
  const [getDashboards, { data: dashboards }] = useLazyGetDashboardsQuery();

  const [dashboardUrls, setDashboardUrls] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    getDashboards();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (dashboards) {
      dashboards.forEach(async ({ externalId }) => {
        triggerDashboardUrl(externalId);
      });
      // Refresh dashboard url every 14 minutes 30 seconds as expiry is 15 minutes
      interval = setInterval(() => {
        dashboards.forEach(async ({ externalId }) => {
          triggerDashboardUrl(externalId);
        });
      }, 870000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dashboards]);

  const triggerDashboardUrl = async (dashboardId: string) => {
    try {
      const data = await getDashboardUrl({ dashboardId });
      setDashboardUrls(prev => ({
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
          src={dashboardUrls[id]?.replace("bordered=true", "bordered=false")}
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
