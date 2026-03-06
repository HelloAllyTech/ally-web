import { FC } from "react";

import { HoverGlass } from "@assets";

export interface ShortSessionUIProps {
  className?: string;
}

export const ShortSessionUI: FC<ShortSessionUIProps> = ({ className = "" }) => {
  return (
    <div
      className={`flex flex-col min-h-[80vh] items-center min-h-[200px] min-w-[50vw] w-full ${className}`}
      data-testid="short-session-message"
    >
      <div className="w-full pb-[10px]">
        <div className="text-typography-900 text-md pb-[10px] font-primary">Session Review</div>
        <hr />
      </div>
      <div className="w-full flex flex-col min-h-[50vh] items-center justify-center">
        <HoverGlass />
        <div className="w-full px-6 py-5 text-center">
          <div className="text-typography-900 text-2xl font-medium font-primary">
            Session ended too soon
          </div>
          <p className="font-primary text-base font-medium text-typography-900">
            We need more interaction data to provide meaningful feedback.
          </p>
        </div>
      </div>
    </div>
  );
};
