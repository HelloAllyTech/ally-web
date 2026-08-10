import { FC } from "react";

import {
  CarbonDropdown as Dropdown,
  CarbonToggle as Toggle,
  ComboBox,
  DatePicker,
  DatePickerInput,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ally-ui-mono/ui-shared";
import { Button, EmptyState } from "@components";
import { ButtonVariant } from "@components/types";
import { AwsLogLevel, AwsLogService } from "@types";
import { formatDate } from "@utils";

import {
  AWS_LOG_LEVELS,
  AWS_LOG_SERVICES,
  RANGE_PRESETS,
  RangePresetId,
  useAwsLogs,
} from "./useAwsLogs";

export const Logs: FC = () => {
  const {
    events,
    isLoading,
    isFetching,
    isError,
    streams,
    service,
    onServiceChange,
    rangePreset,
    onRangePresetChange,
    customFrom,
    customTo,
    onCustomRangeChange,
    level,
    onLevelChange,
    logStreamName,
    onLogStreamNameChange,
    searchInput,
    setSearchInput,
    live,
    toggleLive,
    hasActiveFilters,
    clearFilters,
    canPrev,
    canNext,
    goPrev,
    goNext,
  } = useAwsLogs();

  const selectedRange = RANGE_PRESETS.find(p => p.id === rangePreset) ?? RANGE_PRESETS[0];
  const streamItems = streams.map(s => ({ id: s.name, label: s.name }));
  const selectedStream = logStreamName ? { id: logStreamName, label: logStreamName } : null;

  return (
    <div className="h-full font-primary flex flex-col">
      <div>
        <h1 className="text-2xl text-typography-900 font-secondary">Logs</h1>
        <p className="text-sm text-typography-700 mt-1">
          AWS CloudWatch logs for ally-be, ally-ai and ally-ai-learn.
        </p>
      </div>

      {/* Toolbar: service + time range + level + stream + search + live. */}
      <div className="flex flex-wrap items-end gap-3 mt-6 shrink-0">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-typography-700">Service</label>
          <Select
            id="aws-logs-service"
            labelText="Service"
            hideLabel
            value={service}
            onChange={e => onServiceChange(e.target.value as AwsLogService)}
          >
            {AWS_LOG_SERVICES.map(s => (
              <SelectItem key={s.id} value={s.id} text={s.label} />
            ))}
          </Select>
        </div>

        <div className="w-52">
          <Dropdown
            id="aws-logs-range"
            size="md"
            titleText="Time range"
            hideLabel
            label="Time range"
            items={RANGE_PRESETS}
            selectedItem={selectedRange}
            itemToString={item => item?.label ?? ""}
            onChange={({ selectedItem }) => {
              if (selectedItem) onRangePresetChange(selectedItem.id as RangePresetId);
            }}
          />
        </div>

        {rangePreset === "custom" && (
          <DatePicker
            datePickerType="range"
            dateFormat="Y-m-d"
            value={[customFrom, customTo].filter(Boolean) as Date[]}
            onChange={(dates: Date[]) => onCustomRangeChange(dates?.[0], dates?.[1])}
          >
            <DatePickerInput
              id="aws-logs-date-from"
              labelText="From"
              placeholder="yyyy-mm-dd"
              size="md"
            />
            <DatePickerInput
              id="aws-logs-date-to"
              labelText="To"
              placeholder="yyyy-mm-dd"
              size="md"
            />
          </DatePicker>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs text-typography-700">Level</label>
          <Select
            id="aws-logs-level"
            labelText="Level"
            hideLabel
            value={level}
            onChange={e => onLevelChange(e.target.value as AwsLogLevel | "")}
          >
            <SelectItem value="" text="All levels" />
            {AWS_LOG_LEVELS.map(l => (
              <SelectItem key={l} value={l} text={l} />
            ))}
          </Select>
        </div>

        <div className="w-56">
          <ComboBox
            id="aws-logs-stream"
            size="md"
            titleText="Log stream"
            placeholder="All streams"
            items={streamItems}
            selectedItem={selectedStream}
            itemToString={item => item?.label ?? ""}
            onChange={({ selectedItem }) => onLogStreamNameChange(selectedItem?.id ?? "")}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-typography-700">Search</label>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Filter log message"
            className="w-[220px] rounded border border-border-light px-3 py-2 bg-white text-sm outline-none focus:border-primary-500"
          />
        </div>

        <Toggle
          id="aws-logs-live"
          size="sm"
          labelText=""
          labelA="Live off"
          labelB="Live on"
          toggled={live}
          disabled={rangePreset === "custom"}
          onToggle={toggleLive}
        />

        {hasActiveFilters && (
          <Button variant={ButtonVariant.TEXT} onClick={clearFilters} className="h-[40px] px-4">
            Clear filters
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar mt-4">
        {isLoading ? (
          <p className="text-typography-700">Loading…</p>
        ) : isError ? (
          <p className="text-destructive-500">
            Failed to load logs. Check that the log group is configured.
          </p>
        ) : events.length === 0 ? (
          <EmptyState
            title="No log events found"
            subtitle="No events match the current filters in this time range."
            hideActionButton
          />
        ) : (
          <Table className="w-full text-left border-collapse">
            <TableHead>
              <TableRow className="border-b border-border-light text-sm text-typography-700">
                <TableHeader className="py-3 pr-4 font-medium">Timestamp</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Log Stream</TableHeader>
                <TableHeader className="py-3 pr-4 font-medium">Message</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map(event => (
                <TableRow
                  key={event.eventId}
                  className="border-b border-border-light text-sm text-typography-900 align-top"
                >
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {formatDate(new Date(event.timestamp).toISOString())}
                  </TableCell>
                  <TableCell className="py-3 pr-4 whitespace-nowrap">
                    {event.logStreamName}
                  </TableCell>
                  <TableCell className="py-3 pr-4 font-mono text-xs whitespace-pre-wrap break-all">
                    {event.message}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination footer. CloudWatch is cursor-based — no total count. */}
      {events.length > 0 && (
        <div className="flex items-center justify-between shrink-0 border-t border-border-light pt-3 mt-2">
          <span className="text-sm text-typography-700">{isFetching ? "Updating…" : ""}</span>
          <div className="flex gap-2">
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={goPrev}
              disabled={!canPrev}
              className="h-[36px] px-4"
            >
              Previous
            </Button>
            <Button
              variant={ButtonVariant.SECONDARY}
              onClick={goNext}
              disabled={!canNext}
              className="h-[36px] px-4"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
