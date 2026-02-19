import { FunctionComponent, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { logger } from "@ally-ui-mono/ui-shared";
import { useLazyGetDashboardsQuery, useLazyGetDashboardUrlQuery } from "@api";
import { NoAnalytics } from "@assets";
import { ToggleButtonGroup } from "@components";
import { AnalyticsType } from "@constants";

import { analyticsTypeOptions, ANALYTICS_DASHBOARD_REFRESH_INTERVAL } from "./constants";

export const Analytics: FunctionComponent = () => {
  const { t } = useTranslation();
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
    <div
      className={"flex flex-col justify-center m-6 overflow-hidden h-[calc(100vh-100px)]"}
      data-testid="analytics-page"
    >
      <div data-testid="analytics-header">
        <div
          className="text-typography-900 font-secondary text-2xl font-[500] flex items-center gap-2 mb-2"
          data-testid="analytics-title"
        >
          {t("analytics.title")}
        </div>
        {analyticsToggleOptions?.length > 1 && (
          <ToggleButtonGroup
            data-testid="analytics-type-toggle"
            value={analyticsType}
            onValueChange={changeToggle}
            items={analyticsToggleOptions.map(option => ({
              ...option,
              label: t(option.labelKey as string),
            }))}
          />
        )}
      </div>
      <div
        className="h-[90vh] w-full flex flex-col items-center justify-center"
        data-testid="analytics-content"
      >
        {hasValidDashboards &&
          Object.keys(dashboardUrls).map(id => (
            <iframe
              key={id}
              data-testid={`analytics-dashboard-${id}`}
              title={t("analytics.dashboardTitle")}
              src={dashboardUrls[id]?.replace("bordered=true", "bordered=false")}
              width="100%"
              height="100%"
              onError={() => triggerDashboardUrl(id)}
            />
          ))}
        {dashboards?.length === 0 && !hasValidDashboards && (
          <div
            className="flex-1 w-full flex items-center justify-center"
            data-testid="analytics-empty-state"
          >
            <div className="flex flex-col items-center">
              <NoAnalytics data-testid="analytics-no-data-icon" />
              <div className="mt-4 text-center max-w-md">
                <div
                  className="text-typography-900 font-secondary text-xl font-[600]"
                  data-testid="analytics-empty-title"
                >
                  {t("analytics.empty.title")}
                </div>
                <div
                  className="text-typography-600 font-secondary text-base mt-1"
                  data-testid="analytics-empty-description"
                >
                  {t("analytics.empty.description")}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
