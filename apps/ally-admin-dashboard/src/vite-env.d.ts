/// <reference types="vite/client" />

declare module "*.svg" {
  import React from "react";
  const SVG: React.VFC<
    React.SVGProps<SVGSVGElement> & { className?: string; style?: React.CSSProperties }
  >;
  export default SVG;
}

declare module "*.svg?react" {
  import React from "react";
  const SVG: React.VFC<
    React.SVGProps<SVGSVGElement> & { className?: string; style?: React.CSSProperties }
  >;
  export default SVG;
}
