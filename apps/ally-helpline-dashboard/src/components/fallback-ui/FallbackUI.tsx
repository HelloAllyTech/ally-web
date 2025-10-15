import { FC } from "react";

import { CircularProgress } from "@mui/material";

import { Button } from "../button";
import { FallbackUIProps } from "./types";

const FallbackUI: FC<FallbackUIProps> = ({
  icon: Icon,
  mainMessage,
  description,
  className,
  button,
  isLoading,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-9 ${className}`}>
      {isLoading ? (
        <CircularProgress />
      ) : (
        <>
          <div className="flex flex-col items-center gap-2 text-center">
            {Icon}
            <h2 className="text-[24px] text-[#49454F]">{mainMessage}</h2>
            <p className="text-[12px] text-[#787680]">{description}</p>
          </div>
          {button && <Button onClick={button.onClick}>{button.text}</Button>}
        </>
      )}
    </div>
  );
};

export default FallbackUI;
