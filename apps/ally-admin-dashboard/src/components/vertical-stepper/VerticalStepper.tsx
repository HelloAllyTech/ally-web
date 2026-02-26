import { FC } from "react";

import { VerticalStepperProps, Step } from "@components/types";

const stepStatusMap = {
  completed: "completed",
  active: "active",
  pending: "pending",
};

export const VerticalStepper: FC<VerticalStepperProps> = ({
  steps,
  currentStep,
  onStepClick,
  disabled = false,
}) => {
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
        return `${baseStyles} text-typography-800`;
      case stepStatusMap.active:
        return `${baseStyles} text-typography-900 font-medium`;
      case stepStatusMap.pending:
        return `${baseStyles} text-typography-800`;
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
        return `${baseStyles} border-border-light`;
      case stepStatusMap.active:
        return `${baseStyles} border-primary-500 bg-primary-500`;
      case stepStatusMap.pending:
        return `${baseStyles} border-border-light`;
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
    <div
      className={`min-w-[150px] lg:min-w-[200px] border-r border-border-light px-2 py-3 transition-opacity ${disabled ? "opacity-50" : ""}`}
    >
      <nav>
        {steps.map((step, index) => {
          const status = getStepStatus(step, index);
          return (
            <div
              key={step.id}
              className={disabled ? "cursor-not-allowed" : "cursor-pointer"}
              onClick={() => !disabled && onStepClick?.(step.id)}
            >
              <div className={getStepStyles(step, index)}>
                <div className={getCircleStyles(step, index)}>
                  {status === stepStatusMap.active && <div className={getDotStyles(step, index)} />}
                </div>
                <span className="text-xs lg:text-base">{step.title}</span>
              </div>
              <div
                className={`h-[24px] bg-neutral-200 w-[2px] ml-[7px] lg:ml-[11px] ${index === steps.length - 1 && "hidden"}`}
              />
            </div>
          );
        })}
      </nav>
    </div>
  );
};
