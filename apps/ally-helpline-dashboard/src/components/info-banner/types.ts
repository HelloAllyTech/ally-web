import { FC, SVGProps } from "react";

export interface InfoBannerProps {
  message: string;
  icon: FC<SVGProps<SVGSVGElement>>;
  wrapperClassName?: string;
  messageClassName?: string;
  iconClassName?: string;
}
