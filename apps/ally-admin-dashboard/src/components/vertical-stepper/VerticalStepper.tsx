import { FC } from "react";

import { VerticalStepperProps, Step } from "@components/types";

const stepStatusMap = {
  completed: "completed",
  active: "active",
  pending: "pending",
};

export const VerticalStepper: FC<VerticalStepperProps> = ({ steps, currentStep, onStepClick }) => {
  const getStepStatus = (_step: Step, stepIndex: number) => {
    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    if (stepIndex < currentStepIndex) {
      return stepStatusMap.completed;
    } else if (stepIndex === currentStepIndex) {
      return stepStatusMap.active;
    } else {
      return stepStatusMap.pending;
    }
  };

  const getStepStyles = (step: Step, stepIndex: number) => {
    const baseStyles = "flex items-center gap-2";
    const status = getStepStatus(step, stepIndex);

    switch (status) {
      case stepStatusMap.completed:
        return `${baseStyles} text-gray-500`;
      case stepStatusMap.active:
        return `${baseStyles} text-black`;
      case stepStatusMap.pending:
        return `${baseStyles} text-gray-500`;
      default:
        return baseStyles;
    }
  };

  const getCircleStyles = (step: Step, stepIndex: number) => {
    const baseStyles =
      "w-4 lg:w-6 h-4 lg:h-6 border rounded-full flex items-center justify-center flex-shrink-0";
    const status = getStepStatus(step, stepIndex);

    switch (status) {
      case stepStatusMap.completed:
        return `${baseStyles} border-gray-300`;
      case stepStatusMap.active:
        return `${baseStyles} border-blue-600 bg-blue-600`;
      case stepStatusMap.pending:
        return `${baseStyles} border-gray-300`;
      default:
        return baseStyles;
    }
  };

  const getDotStyles = (step: Step, stepIndex: number) => {
    const status = getStepStatus(step, stepIndex);
    if (status === stepStatusMap.active) {
      return "w-2 h-2 bg-white rounded-full";
    }
    return "";
  };

  return (
    <div className="min-w-[150px] lg:min-w-[200px] border-r border-gray-200 px-2 py-3">
      <nav>
        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          return (
            <div key={step.id} className="cursor-pointer" onClick={() => onStepClick?.(step.id)}>
              <div className={getStepStyles(step, index)}>
                <div className={getCircleStyles(step, index)}>
                  {status === stepStatusMap.active && <div className={getDotStyles(step, index)} />}
                </div>
                <span className="text-[12px] lg:text-[14px] font-medium">{step.title}</span>
              </div>
              <div
                className={`h-[24px] bg-gray-200 w-[2px] ml-[7px] lg:ml-[11px] ${index === steps.length - 1 && "hidden"}`}
              />
            </div>
          );
        })}
      </nav>
    </div>
  );
};
