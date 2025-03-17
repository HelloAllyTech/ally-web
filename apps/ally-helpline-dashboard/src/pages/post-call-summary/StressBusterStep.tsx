import { FunctionComponent } from "react";

import { StressBuster } from "@/components";

const StressBusterStep: FunctionComponent = () => {
  return (
    <div className="flex flex-col p-8 bg-white rounded-lg shadow-sm overflow-hidden mt-4 border">
      <h2 className="text-base font-medium text-gray-800 mb-8">
        Let&apos;s try a stress buster
      </h2>

      <div className="w-full max-w-3xl aspect-video mb-8 rounded-3xl overflow-hidden">
        <StressBuster />
      </div>

      <button
        className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors w-fit self-end"
        onClick={() => {
          /* Handle navigation */
        }}
      >
        Proceed to call summary
      </button>
    </div>
  );
};

export default StressBusterStep;
