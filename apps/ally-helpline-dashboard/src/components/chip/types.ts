import { FunctionComponent, SVGProps } from "react";

export interface ChipProps {
  className?: string;
  config: ChipConfig;
}

export interface ChipConfig {
  label: string;
  dotClassName?: string;
  outerDivClassName?: string;
  icon?: FunctionComponent<SVGProps<SVGSVGElement>>;
}
