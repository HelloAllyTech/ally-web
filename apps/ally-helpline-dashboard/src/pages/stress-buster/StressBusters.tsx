import { FunctionComponent, useState } from "react";

import { Flower } from "@/assets/images";
import { Button, StressBuster } from "@/components";
import { BackgroundBottom, BackgroundTop } from "@/assets/icons";

import { STRESS_BUSTERS } from "./constants";

const StressBusters: FunctionComponent = () => {
  const [showStressBuster, setShowStressBuster] = useState<boolean>(false);
  const toggleStressBuster = () => {
    setShowStressBuster((prev) => !prev);
  };

  if (showStressBuster)
    return (
      <StressBuster isFullScreenMode onClose={toggleStressBuster} playOnMount />
    );
  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="h-[290px] w-full bg-[#110924] rounded-sm text-white overflow-hidden z-0">
        <BackgroundTop
          height={300}
          width={360}
          className="absolute right-6 rounded-sm -z-10"
        />
        <BackgroundBottom
          height={300}
          width={420}
          className="absolute top-24 rounded-sm -z-10"
        />
        <img
          src={Flower}
          alt="Flower"
          className="absolute right-24 top-26 rounded-sm -z-10 h-[290px]"
        />
        <div className="my-auto max-w-[40%] ml-10 mt-20 z-10">
          <div className="text-base font-medium mb-5">
            Box Breathing: Reset Your Mind in Minutes
          </div>
          <div className="text-sm font-normal mb-4">
            A simple breathing technique to calm your nervous system, improve
            focus, and reduce stress. Follow the 4-4-4-4 method for instant
            relaxation.
          </div>
          <Button className="rounded-full" onClick={toggleStressBuster}>
            Try now
          </Button>
        </div>
      </div>
      <div className="text-lg font-medium text-[#47464F]">Other Techniques</div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {STRESS_BUSTERS.map((buster, index) => (
          <div
            key={index}
            className="bg-white rounded-sm p-3 hover:shadow-md border border-[#E5E7EB] cursor-pointer"
          >
            <img
              src={buster.image}
              alt={buster.title}
              className="w-full h-48 object-cover rounded-[2px] mb-2"
            />
            <h3 className="text-base font-medium text-[#4A4459] mb-2">
              {buster.title}
            </h3>
            <p className="text-sm text-[#929090] font-normal">
              {buster.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StressBusters;
