import { FC } from "react";

import { ShinyTextProps } from "./types";

const ShinyText: FC<ShinyTextProps> = ({ text, duration = 2000, className = "" }) => {
  return (
    <span
      className={[
        // layout
        "relative inline-block",
        // gradient used for the shine
        "bg-gradient-to-r from-black via-gray-300 to-black",
        // clip gradient into text
        "bg-clip-text text-transparent",
        // make the gradient wider than the text so the shine can travel
        "bg-[length:200%_100%]",
        // run the keyframes (defined below)
        "animate-[shiny-text_linear_infinite]",
        className,
      ].join(" ")}
      // control speed without touching tailwind config
      style={{ animationDuration: `${duration}ms` }}
      aria-label={text}
    >
      {text}
      {/* Global keyframes so it works in both Next and plain React */}
      <style>{`
        @keyframes shiny-text {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </span>
  );
};

export default ShinyText;
