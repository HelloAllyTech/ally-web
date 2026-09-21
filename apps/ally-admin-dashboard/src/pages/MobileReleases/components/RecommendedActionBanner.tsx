import { FC } from "react";

import { CheckCircle, WarningAlt } from "@icons";

import { Button } from "@ally-ui-mono/ui-shared";

import { RecommendedAction } from "../mobileReleaseStatus";

interface RecommendedActionBannerProps {
  action: RecommendedAction;
  onSubmitReview: () => void;
}

const SEVERITY_STYLES: Record<
  RecommendedAction["severity"],
  { container: string; icon: FC<{ size?: number; className?: string }> | null; iconClass: string }
> = {
  action: {
    container: "border-primary-200 bg-primary-50",
    icon: WarningAlt,
    iconClass: "text-primary-500",
  },
  attention: {
    container: "border-warning-200 bg-warning-50",
    icon: WarningAlt,
    iconClass: "text-warning-500",
  },
  clear: {
    container: "border-border-light bg-white",
    icon: CheckCircle,
    iconClass: "text-success-400",
  },
};

/**
 * The single most important "what should I do next" answer, always shown
 * above the fold regardless of which history tab is open. Calm by default
 * (severity "clear" reads as an ordinary card, not a big green banner) and
 * only reaches for warning colour when there's something Apple actually
 * flagged — never a full-width red block, per this page's own "use colour
 * semantically, don't paint large areas red" brief.
 */
export const RecommendedActionBanner: FC<RecommendedActionBannerProps> = ({
  action,
  onSubmitReview,
}) => {
  const style = SEVERITY_STYLES[action.severity];
  const Icon = style.icon;

  return (
    <div
      className={`rounded border px-4 py-3 flex items-center justify-between gap-4 ${style.container}`}
    >
      <div className="flex items-start gap-3">
        {Icon && <Icon size={20} className={`shrink-0 mt-0.5 ${style.iconClass}`} />}
        <div>
          <p className="text-sm font-medium text-typography-900">{action.title}</p>
          <p className="text-sm text-typography-700 mt-0.5">{action.description}</p>
        </div>
      </div>
      {action.actionKind === "submit-ios-review" && (
        <Button kind="primary" size="md" className="shrink-0" onClick={onSubmitReview}>
          Submit for Review
        </Button>
      )}
    </div>
  );
};
