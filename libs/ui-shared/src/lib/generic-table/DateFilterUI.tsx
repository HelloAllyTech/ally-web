"use client";
import React from "react";

import { Calendar as ReactCalendar } from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./DateFilterUI.css";

// Quick date presets for the date filter
const quickPresets = [
  {
    label: "Today",
    getRange: () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return [yesterday, today];
    },
  },
  {
    label: "This week",
    getRange: () => {
      const today = new Date();
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return [start, end];
    },
  },
  {
    label: "This month",
    getRange: () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return [start, end];
    },
  },
  { label: "Custom", getRange: () => [null, null] },
];

type CalendarValue = Date | [Date | null, Date | null] | null;

/**
 * Props for the DateFilterUI component.
 */
export interface DateFilterUIProps {
  selectedValues: string[];
  onChange: (value: string[]) => void;
  onDateSelect?: (value: string[]) => void;
}

/**
 * DateFilterUI displays a date range picker and quick presets for date filtering.
 *
 * @param {DateFilterUIProps} props - The props for the date filter UI.
 */
const DateFilterUI: React.FC<DateFilterUIProps> = ({ selectedValues, onChange, onDateSelect }) => {
  const [range, setRange] = React.useState<CalendarValue>(
    selectedValues[0] && selectedValues[1]
      ? [new Date(selectedValues[0]), new Date(selectedValues[1])]
      : null,
  );
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);

  const handlePreset = (preset: (typeof quickPresets)[0]) => {
    const [start, end] = preset.getRange();
    if (start && end) {
      setRange([start, end]);
      const arr = [start.toISOString(), end.toISOString()];
      onChange(arr);
    } else {
      setRange(null);
    }
    setSelectedPreset(preset.label);
  };

  const handleCalendarChange = (value: CalendarValue) => {
    if (
      Array.isArray(value) &&
      value.length === 2 &&
      value[0] instanceof Date &&
      value[1] instanceof Date
    ) {
      setRange([value[0], value[1]]);
      const arr = [value[0].toISOString(), value[1].toISOString()];
      onChange(arr);
    } else if (value === null) {
      setRange(null);
    } else if (Array.isArray(value)) {
      setRange(value);
    }
  };

  const handleSave = () => {
    if (Array.isArray(range) && range[0] && range[1]) {
      onChange([range[0].toISOString(), range[1].toISOString()]);
      if (onDateSelect) onDateSelect([range[0].toISOString(), range[1].toISOString()]);
    }
  };

  return (
    <div className="p-[14px] text-[#000]">
      <div className="text-[14px] font-[500] mb-[10px]">Quick presets</div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {quickPresets.map(preset => (
          <button
            key={preset.label}
            className={`border rounded px-2 py-1 hover:bg-gray-100 ${
              selectedPreset === preset.label ? "bg-gray-100" : ""
            }`}
            onClick={() => handlePreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-[6px] mt-[12px]">
        <div className="text-[14px] w-[50%]">From</div>
        <div className="text-[14px] w-[50%]">To</div>
      </div>
      <div className="flex gap-2 mb-2">
        <input
          className="border rounded px-2 py-1 w-full text-[#6B7280]"
          placeholder="Starting"
          value={
            Array.isArray(range) && range[0] instanceof Date ? range[0].toLocaleDateString() : ""
          }
          readOnly
        />
        <input
          className="border rounded px-2 py-1 w-full text-[#6B7280]"
          placeholder="Ending"
          value={
            Array.isArray(range) && range[1] instanceof Date ? range[1].toLocaleDateString() : ""
          }
          readOnly
        />
      </div>
      {selectedPreset === "Custom" && (
        <div className="react-calendar-wrapper">
          <ReactCalendar
            selectRange
            value={range}
            maxDate={new Date()}
            onChange={handleCalendarChange}
            className="w-full border-0"
          />
        </div>
      )}
      <div className="flex justify-end mt-2">
        <button
          className="bg-primary-600 disabled:bg-primary-300 text-white px-4 py-1 rounded hover:bg-primary-700"
          onClick={handleSave}
          disabled={!range || !Array.isArray(range) || range.length !== 2}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default DateFilterUI;
