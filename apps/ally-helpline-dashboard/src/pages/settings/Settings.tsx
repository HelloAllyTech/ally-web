import { ComingSoon } from "@assets";
import { FallbackUI } from "@components";

export const Settings = () => {
  return (
    <div className="h-[90vh] flex items-center justify-center">
      <FallbackUI
        icon={<ComingSoon />}
        mainMessage="Coming Soon"
        description="We’re working on something exciting! This feature will be available soon."
      />
    </div>
  );
};
