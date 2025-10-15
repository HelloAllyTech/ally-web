import { FunctionComponent, useEffect, useMemo, useState } from "react";

import { logger } from "@ally-ui-mono/ui-shared";
import { useLazyGetDashboardsQuery, useLazyGetDashboardUrlQuery } from "@api";
import { NoAnalytics } from "@assets";
import { ToggleButtonGroup } from "@components";
import { AnalyticsType } from "@constants";

import { analyticsTypeOptions, ANALYTICS_DASHBOARD_REFRESH_INTERVAL } from "./constants";

export const Analytics: FunctionComponent = () => {
  const [getDashboardUrl] = useLazyGetDashboardUrlQuery();
  const [getDashboards, { data: dashboards }] = useLazyGetDashboardsQuery();

  const [analyticsType, setAnalyticsType] = useState<AnalyticsType>();
  const [dashboardUrls, setDashboardUrls] = useState<{ [id: string]: string }>({});
  const hasValidDashboards = Object.values(dashboardUrls).some(Boolean);

  useEffect(() => {
    getDashboards();
  }, []);

  const analyticsToggleOptions = useMemo(
    () =>
      dashboards
        ? analyticsTypeOptions.filter(option =>
            dashboards.some(dashboard => dashboard.analyticsType === option.value),
          )
        : [],
    [dashboards],
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (dashboards && analyticsType) {
      dashboards
        .filter(dashboard => dashboard.analyticsType === analyticsType)
        .forEach(async ({ externalId }) => {
          triggerDashboardUrl(externalId);
        });
      // Auto refresh of all dashboards as there is an expiry for signed url
      interval = setInterval(() => {
        dashboards
          .filter(dashboard => dashboard.analyticsType === analyticsType)
          .forEach(async ({ externalId }) => {
            triggerDashboardUrl(externalId);
          });
      }, ANALYTICS_DASHBOARD_REFRESH_INTERVAL);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [dashboards, analyticsType]);

  // Setting the first one from toggle group as default
  useEffect(() => {
    if (analyticsToggleOptions?.[0]) setAnalyticsType(analyticsToggleOptions[0].value);
  }, [analyticsToggleOptions]);

  const changeToggle = (value: AnalyticsType) => {
    setDashboardUrls({});
    setAnalyticsType(value);
  };

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
    <div className={"flex flex-col justify-center m-6 overflow-hidden h-[calc(100vh-100px)]"}>
      <div>
        <div className="text-[#0D0D0D] font-['IBM_Plex_Serif'] text-[24px] font-[500] flex items-center gap-2 mb-2">
          Session Analytics
        </div>
        {analyticsToggleOptions?.length > 1 && (
          <ToggleButtonGroup
            value={analyticsType}
            onValueChange={changeToggle}
            items={analyticsToggleOptions}
          />
        )}
      </div>
      <div className="h-[90vh] w-full flex flex-col items-center justify-center">
        {hasValidDashboards &&
          Object.keys(dashboardUrls).map(id => (
            <iframe
              key={id}
              title="Metabase dashboard"
              src={dashboardUrls[id]?.replace("bordered=true", "bordered=false")}
              width="100%"
              height="100%"
              // TODO: Handle error in a way that url is triggered only when token expiry is triggered
              onError={() => triggerDashboardUrl(id)}
            />
          ))}
        {dashboards?.length === 0 && !hasValidDashboards && (
          <>
            <div className="ml-15 mb-4 text-2xl text-gray-700 self-start">
              Organization Admin Dashboard
            </div>
            <div className="flex-1 w-full flex items-center justify-center">
              <NoAnalytics />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
