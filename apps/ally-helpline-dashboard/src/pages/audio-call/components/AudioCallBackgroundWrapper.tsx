import { FunctionComponent, ReactNode } from "react";
import { BackgroundBottom, BackgroundTop } from "@/assets/icons";

const AudioCallBackgroundWrapper: FunctionComponent<{
  children: ReactNode;
}> = ({ children }) => {
  return (
    <div className="w-screen h-screen bg-[#FFF] relative flex flex-col gap-10 justify-center items-center overflow-hidden">
      {children}
      
    </div>
  );
};

export default AudioCallBackgroundWrapper;
