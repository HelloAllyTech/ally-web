import { useState } from "react";

import { ToggleButtonGroup } from "@/components";

import { stressBusterControlOptions } from "./constants";

const Settings = () => {
  const [showStressBuster, setShowStressBuster] = useState(localStorage.getItem("showStressBuster") || "true");

  const handleStressBusterControl = (value: string) => {
    localStorage.setItem("showStressBuster", value);
    setShowStressBuster(value);
  };

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <h1 className="font-medium text-[#47464F]">Settings</h1>
      <div className="flex items-center gap-8">
        <span>Show Stress Buster after call</span>
        <ToggleButtonGroup
          value={showStressBuster}
          onValueChange={handleStressBusterControl}
          successValue="true"
          items={stressBusterControlOptions}
        />
      </div>
    </div>
  );
};

export default Settings;
