import { useEffect } from "react";

import { useLazyGetDashboardUrlQuery } from "@/api/analytics";
import { metabaseDashboardId } from "@/constants/envVariables";
const Analytics = () => {
  const [getDashboardUrl, { data: dashboardUrl }] =
    useLazyGetDashboardUrlQuery();

  const triggerDashboardUrl = () => {
    getDashboardUrl({ dashboardId: metabaseDashboardId });
  };

  useEffect(() => {
    triggerDashboardUrl();
  }, []);

  return (
    <div className="h-[90vh] flex items-center justify-center">
      <iframe
        title="Metabase dashboard"
        src={dashboardUrl?.url}
        frameBorder="0"
        width="100%"
        height="100%"
        // TODO: Handle error in a way that url is triggered only when token expiry is triggered
        onError={triggerDashboardUrl}
      ></iframe>
    </div>
  );
};

export default Analytics;
