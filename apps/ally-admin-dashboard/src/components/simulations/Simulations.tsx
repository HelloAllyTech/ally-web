import { useState } from "react";

import { Search } from "@assets";
import { en } from "@constants";
import { useSimulations } from "@hooks";

import { Button } from "../button";

export const Simulations = () => {
  const [showSimulation, setShowSimulation] = useState(false);
  const [selectedSimulations, setSelectedSimulations] = useState([]);

  const { simulationsResponse } = useSimulations({});

  const toggleSelection = id => {
    setSelectedSimulations(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
    );
  };

  const renderSimulation = () => {
    return (
      <div className="fixed inset-0 z-50">
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-[1px]" />
        <div className="fixed inset-0 flex items-center justify-center px-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full animate-in fade-in-0 zoom-in-95 duration-200 px-6 py-4">
            <h1 className="text-lg font-semibold">{en.simulation.addSimulationToPath}</h1>

            {/* Search bar */}
            <div className="relative w-full mt-4 ">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search simulation"
                className="pl-10 w-full !outline-none border  border-gray-200  rounded-md py-1"
              />
            </div>

            {/* Simulation list */}
            <div className="mt-4 max-h-72 overflow-y-auto">
              {simulationsResponse?.data.map(simulation => (
                <div
                  key={simulation.id}
                  className="flex items-center gap-3 py-2  border-gray-100 hover:bg-gray-50 rounded-md px-2 cursor-pointer"
                  onClick={() => toggleSelection(simulation.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedSimulations.includes(simulation.id)}
                    onChange={() => toggleSelection(simulation.id)}
                    onClick={e => e.stopPropagation()}
                    className="cursor-pointer"
                  />
                  <img
                    src={simulation.coverImageUrl}
                    alt={simulation.title}
                    className="w-10 h-10 rounded-md object-cover"
                  />
                  <span className="text-sm text-gray-800">{simulation.title}</span>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="mt-4 flex justify-end gap-3 border-t pt-3">
              <Button
                variant="secondary"
                className="w-1/3"
                onClick={() => setShowSimulation(false)}
              >
                {en.common.cancel}
              </Button>
              <Button
                className="w-1/3"
                onClick={() => {
                  setShowSimulation(false);
                }}
              >
                {en.simulation.addSelected}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full items-center justify-center">
      <Button onClick={() => setShowSimulation(true)}>{en.simulation.addSimulation}</Button>
      {showSimulation && renderSimulation()}
    </div>
  );
};
