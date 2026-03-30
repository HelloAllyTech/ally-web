import { FC, useMemo } from "react";

import { TabItem } from "@src/components/types";

import { Tabs } from "@ally-ui-mono/ui-shared";
import {
  REPORT_GENERATION_MESSAGES,
  REPORT_METRIC_CONFIG,
  ReportGenerationMetrics,
} from "@constants";

import TranscriptSection from "./TranscriptSection";
import ReportContentProps from "./types";

const ReportContent: FC<ReportContentProps> = ({
  transcriptData,
  reportData,
  activeTab,
  onTabChange,
  showTabs = true,
  isTranscriptLoading = false,
  hasMoreTranscript = false,
  isTranscriptLoadingMore = false,
  onLoadMoreTranscript,
}) => {
  const items: TabItem[] = [
    {
      id: "report",
      label: REPORT_GENERATION_MESSAGES.REPORT,
    },
    {
      id: "transcription",
      label: REPORT_GENERATION_MESSAGES.TRANSCRIPTION,
    },
  ];

  const metricsAverage = useMemo(() => {
    if (!reportData.metrics || Object.keys(reportData.metrics).length === 0) return null;
    const values = Object.values(reportData.metrics);
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
  }, [reportData.metrics]);

  const getColorFromRange = (value: number) => {
    if (value < 33) return "#FE6F64";
    if (value < 66) return "#FFB74D";
    return "#81C784";
  };

  return (
    <>
      {showTabs && (
        <Tabs
          items={items}
          activeId={activeTab}
          onChange={id => onTabChange(id)}
          showCount={false}
          className="w-full [&_nav]:flex [&_nav]:w-full [&_button]:flex-1 [&_button]:!min-w-0 [&_button]:text-center"
        />
      )}
      {activeTab === "report" ? (
        <div className="flex flex-col gap-6 pt-4">
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-center">
              <span className="text-base font-normal text-typography-900">
                {REPORT_GENERATION_MESSAGES.SIMULATION_SCORE}
              </span>
              <span className="text-5xl font-semibold text-typography-900">
                {metricsAverage ?? 0}
              </span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-base font-medium text-typography-900 mb-6">
              {REPORT_GENERATION_MESSAGES.METRICS}
            </h3>
            <div className="space-y-6">
              {reportData.metrics && Object.keys(reportData.metrics).length > 0 ? (
                Object.values(ReportGenerationMetrics)
                  .filter(
                    (metricKey): metricKey is ReportGenerationMetrics =>
                      metricKey in (reportData.metrics ?? {}),
                  )
                  .map(metricKey => {
                    const value = reportData.metrics![metricKey];
                    const label = REPORT_METRIC_CONFIG[metricKey];
                    const color = getColorFromRange(value);
                    return (
                      <div key={metricKey} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">{label}</span>
                          <span className="text-sm font-medium text-gray-900">{value}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${value}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-gray-500 text-sm">No metrics available yet</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <TranscriptSection
          transcripts={transcriptData}
          isLoading={isTranscriptLoading}
          hasMore={hasMoreTranscript}
          isLoadingMore={isTranscriptLoadingMore}
          onLoadMore={onLoadMoreTranscript}
        />
      )}
    </>
  );
};

export default ReportContent;
