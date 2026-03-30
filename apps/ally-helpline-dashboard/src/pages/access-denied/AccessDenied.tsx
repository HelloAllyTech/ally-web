import { NoResults } from "@assets";
import { FallbackUI } from "@components";

export const AccessDenied = () => (
  <div className="h-[90vh] flex items-center justify-center">
    <FallbackUI
      icon={<NoResults />}
      mainMessage="Access Denied"
      description="You do not have permission to access this page."
    />
  </div>
);
