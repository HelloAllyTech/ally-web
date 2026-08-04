import { FC } from "react";

import { Loading } from "@ally-ui-mono/ui-shared";

import { Button } from "../button";
import { FallbackUIProps } from "./types";

const FallbackUI: FC<FallbackUIProps> = ({
  icon: Icon,
  theme = "light",
  mainMessage,
  description,
  className,
  button,
  isLoading,
}) => {
  const isDarkTheme = theme === "dark";
  return (
    <div
      className={`flex flex-col h-full w-full items-center justify-center gap-9 ${isDarkTheme ? "text-white bg-typography-900" : "text-typography-700 bg-white"} ${className}`}
    >
      {isLoading ? (
        <Loading withOverlay={false} />
      ) : (
        <>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="max-w-full [&>svg]:h-auto [&>svg]:max-w-full">{Icon}</div>
            <h2 className={`text-2xl ${isDarkTheme ? "text-white" : ""}`}>{mainMessage}</h2>
            <p className={`text-xs ${isDarkTheme ? "text-white" : "text-typography-700"}`}>
              {description}
            </p>
          </div>
          {button && <Button onClick={button.onClick}>{button.text}</Button>}
        </>
      )}
    </div>
  );
};

export default FallbackUI;
