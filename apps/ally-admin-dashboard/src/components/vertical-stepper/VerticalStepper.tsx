import { FC } from "react";

import { VerticalStepperProps, Step } from "@components/types";

export const VerticalStepper: FC<VerticalStepperProps> = ({ steps, currentStep, onStepClick }) => {
  const getStepStatus = (step: Step, stepIndex: number) => {
    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    if (stepIndex < currentStepIndex) {
      return "completed";
    } else if (stepIndex === currentStepIndex) {
      return "active";
    } else {
      return "pending";
    }
  };

  const getStepStyles = (step: Step, stepIndex: number) => {
    const baseStyles = "flex items-center gap-2";
    const status = getStepStatus(step, stepIndex);

    switch (status) {
      case "completed":
        return `${baseStyles} text-gray-500`;
      case "active":
        return `${baseStyles} text-black`;
      case "pending":
        return `${baseStyles} text-gray-500`;
      default:
        return baseStyles;
    }
  };

  const getCircleStyles = (step: Step, stepIndex: number) => {
    const baseStyles = "w-6 h-6 border rounded-full flex items-center justify-center flex-shrink-0";
    const status = getStepStatus(step, stepIndex);

    switch (status) {
      case "completed":
        return `${baseStyles} border-gray-300`;
      case "active":
        return `${baseStyles} border-blue-600 bg-blue-600`;
      case "pending":
        return `${baseStyles} border-gray-300`;
      default:
        return baseStyles;
    }
  };

  const getDotStyles = (step: Step, stepIndex: number) => {
    const status = getStepStatus(step, stepIndex);
    if (status === "active") {
      return "w-2 h-2 bg-white rounded-full";
    }
    return "";
  };

  return (
    <div className="min-w-[130px] lg:min-w-[200px] border-r border-gray-200 px-2 py-3">
      <nav>
        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          return (
            <div key={step.id} className="cursor-pointer" onClick={() => onStepClick?.(step.id)}>
              <div className={getStepStyles(step, index)}>
                <div className={getCircleStyles(step, index)}>
                  {status === "active" && <div className={getDotStyles(step, index)} />}
                </div>
                <span className="text-sm font-medium">{step.title}</span>
              </div>
              <div
                className={`h-[24px] bg-gray-200 w-[2px] ml-[11px] ${index === steps.length - 1 && "hidden"}`}
              />
            </div>
          );
        })}
      </nav>
    </div>
  );
};
