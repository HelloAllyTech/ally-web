import { useEffect, useState } from "react";

import {
  useGetDashboardsQuery,
  useLazyGetDashboardUrlQuery,
} from "@/api/analytics";

const Analytics = () => {
  const [getDashboardUrl] = useLazyGetDashboardUrlQuery();
  const { data: dashboards } = useGetDashboardsQuery();

  const [dashboardUrls, setDashboardUrls] = useState<{ [id: string]: string }>(
    {}
  );

  useEffect(() => {
    if (dashboards) {
      dashboards.forEach(async ({ externalId }) => {
        triggerDashboardUrl(externalId);
      });
    }
  }, [dashboards]);

  const triggerDashboardUrl = async (dashboardId: string) => {
    const data = await getDashboardUrl({ dashboardId });
    setDashboardUrls((prev) => ({
      ...prev,
      [dashboardId]: data?.data?.url,
    }));
  };

  return (
    <div className="h-[90vh] flex items-center justify-center">
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

export default Analytics;
