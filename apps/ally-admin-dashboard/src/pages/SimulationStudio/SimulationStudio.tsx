import React from "react";

import { useNavigate } from "react-router-dom";

import { Add } from "@assets";
import { en } from "@constants";

export const SimulationStudio: React.FC = () => {
  const handleNewSimulation = () => {
    // TODO: Implement new simulation creation logic
  };

  const handleCreateSimulation = () => {
    // TODO: Implement simulation creation logic
  };

  return (
    <div className="min-h-full font-['Replay_Pro']">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-[24px] text-gray-900">Simulation Studio</h1>
        <button
          onClick={handleNewSimulation}
          className="bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-serif px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Add />
          {en.simulation.newSimulation}
        </button>
      </div>

      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-[24px] text-gray-900 mb-4">
            {en.simulation.createYourFirstSimulation}{" "}
            <span className="italic">{en.simulation.simulation}</span>
          </h2>
          <p className="text-gray-600 text-[14px] mb-8 leading-relaxed font-['IBM_Plex_Serif']">
            {en.simulation.newSimulationDescription}
          </p>
          <button
            onClick={handleCreateSimulation}
            className="bg-blue-600 text-[14px] hover:bg-blue-700 text-white px-6 py-3 rounded-[100px] flex items-center gap-2 mx-auto font-serif transition-colors"
          >
            <Add />
            {en.simulation.createSimulation}
          </button>
        </div>
      </div>
    </div>
  );
};
