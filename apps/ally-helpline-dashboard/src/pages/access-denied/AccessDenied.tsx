import { FallbackUI } from "@/components";
import { NoResults } from "@/assets/icons";

const AccessDenied = () => (
  <div className="h-[90vh] flex items-center justify-center">
    <FallbackUI
      image={<NoResults />}
      mainMessage="Access Denied"
      description="You do not have permission to access this page."
    />
  </div>
);

export default AccessDenied;
