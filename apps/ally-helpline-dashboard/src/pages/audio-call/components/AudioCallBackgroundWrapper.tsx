import { FC, ReactNode } from "react";

const AudioCallBackgroundWrapper: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="w-screen h-screen bg-[#FFF] relative flex flex-col gap-10 justify-center items-center overflow-hidden">
      {children}
    </div>
  );
};

export default AudioCallBackgroundWrapper;
