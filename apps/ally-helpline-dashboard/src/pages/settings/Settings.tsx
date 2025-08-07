import { FallbackUI } from "@components";
import { ComingSoon } from "@assets";

export const Settings = () => {
  return (
    <div className="h-[90vh] flex items-center justify-center">
      <FallbackUI
        image={<ComingSoon />}
        mainMessage="Coming Soon"
        description="We’re working on something exciting! This feature will be available soon."
      />
    </div>
  );
};
