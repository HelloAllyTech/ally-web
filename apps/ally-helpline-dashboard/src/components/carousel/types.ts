import { FunctionComponent, SVGProps } from "react";

export type CarouselSlideType = {
  imageSrc: FunctionComponent<SVGProps<SVGSVGElement>>;
  text: string;
};

export enum CarouselVariant {
  LIGHT = "LIGHT",
  DARK = "DARK",
}

export enum CarouselSize {
  SMALL = "SMALL",
  LARGE = "LARGE",
}

export type CarouselProps = {
  slides: CarouselSlideType[];
  intervalSeconds?: number;
  pauseOnHover?: boolean;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  variant?: CarouselVariant;
  size?: CarouselSize;
};
