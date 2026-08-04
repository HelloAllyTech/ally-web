import { useState, useEffect } from "react";

import { CheckCircle } from "lucide-react";

import { LifelineLogo } from "@assets";

export const Health = () => {
  const [lastChecked, setLastChecked] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLastChecked(new Date());
    }, 1000); // Update every second for a live feel

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-dvh bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="flex items-center justify-center space-x-3 mb-6">
          <LifelineLogo className="h-10 w-10" />
          <h1 className="text-3xl font-bold text-typography-800 dark:text-white font-primary">
            Application Health Status
          </h1>
        </div>

        <div className="flex items-center justify-center space-x-3 my-6">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <p className="text-4xl font-extrabold text-green-500">Healthy</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <p className="text-sm text-typography-700 dark:text-typography-600">
            All systems are operating normally. This page confirms that the frontend application is
            running and responsive.
          </p>
          <p className="text-xs text-typography-600 dark:text-typography-700 mt-2">
            Last checked:{" "}
            {lastChecked.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </p>
        </div>
      </div>
    </div>
  );
};
