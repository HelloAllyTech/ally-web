import { ComingSoon } from "@/assets/icons";
import { FallbackUI } from "@/components";

const Analytics = () => {
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

export default Analytics;
