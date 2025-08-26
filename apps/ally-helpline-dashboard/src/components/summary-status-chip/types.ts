import { FunctionComponent, SVGProps } from "react";

import { ChatSummaryStatus } from "@types";

export interface SummaryStatusProps {
  status: ChatSummaryStatus;
  className?: string;
}

export interface StatusConfig {
  label: string;
  dotClassName?: string;
  outerDivClassName?: string;
  icon?: FunctionComponent<SVGProps<SVGSVGElement>>;
}
