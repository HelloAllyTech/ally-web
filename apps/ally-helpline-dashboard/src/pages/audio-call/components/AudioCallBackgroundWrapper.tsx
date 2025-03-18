import { FunctionComponent, ReactNode } from "react";
import { BackgroundBottom, BackgroundTop } from "@/assets/icons";

const AudioCallBackgroundWrapper: FunctionComponent<{
  children: ReactNode;
}> = ({ children }) => {
  return (
    <div className="w-screen h-screen bg-[#161921] relative flex flex-col gap-10 justify-center items-center overflow-hidden">
      <BackgroundTop className="absolute top-0 right-0 opacity-35 z-0" />
      <BackgroundBottom className="absolute bottom-0 left-0 opacity-35 z-0" />
      {children}
    </div>
  );
};

export default AudioCallBackgroundWrapper;
