import { FC } from "react";

import { Button, StressBuster } from "@/components";
import { StressBusterProps } from "./types";

const StressBusterStep: FC<StressBusterProps> = ({ onProceed }) => {
  return (
    <>
      <h2 className="text-base font-medium text-[#47464F]">
        Let&apos;s try a stress buster
      </h2>

      <div className="w-full max-w-3xl aspect-video mb-4 rounded-3xl overflow-hidden">
        <StressBuster />
      </div>
      <Button className="rounded-full w-fit self-end" onClick={onProceed}>
        View Call highlights
      </Button>
    </>
  );
};

export default StressBusterStep;
