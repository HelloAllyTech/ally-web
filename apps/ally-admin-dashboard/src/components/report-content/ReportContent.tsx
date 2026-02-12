import { FC } from "react";

import { REPORT_GENERATION_MESSAGES } from "@constants";

import ReportContentProps from "./types";
import TabButton from "../tab-button/TabButton";

const ReportContent: FC<ReportContentProps> = ({
  reportData,
  activeTab,
  onTabChange,
  showTabs = true,
}) => (
  <>
    {showTabs && (
      <div className="flex gap-8 border-b border-gray-200">
        <TabButton
          label={REPORT_GENERATION_MESSAGES.REPORT}
          isActive={activeTab === "report"}
          onClick={() => onTabChange("report")}
        />
        <TabButton
          label={REPORT_GENERATION_MESSAGES.TRANSCRIPTION}
          isActive={activeTab === "transcription"}
          onClick={() => onTabChange("transcription")}
        />
      </div>
    )}

    {activeTab === "report" ? (
      <div className="flex flex-col gap-6">
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center">
            <span className="text-base font-medium text-typography-900">
              {REPORT_GENERATION_MESSAGES.SIMULATION_SCORE}
            </span>
            <span className="text-5xl font-semibold text-typography-900">{reportData.score}</span>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-base font-medium text-typography-900 mb-6">
            {REPORT_GENERATION_MESSAGES.METRICS}
          </h3>
          <div className="space-y-6">
            {Object.entries(reportData.metrics).map(([metric, percentage], index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">{metric}</span>
                  <span className="text-sm font-medium text-gray-900">{percentage}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: "#FF5454",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ) : (
      <div className="border border-gray-200 rounded-lg p-6 min-h-[300px] flex items-center justify-center">
        <p className="text-gray-500">{REPORT_GENERATION_MESSAGES.TRANSCRIPTION_PLACEHOLDER}</p>
      </div>
    )}
  </>
);

export default ReportContent;
