import React from "react";
import { Popover, TextField } from "@mui/material";
import { Column } from "./types";
import { Calendar as ReactCalendar } from "react-calendar";

interface FilterPopoverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  column: (Column<any> & { filterOptions: { label: string; value: string }[] }) | null;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  selectedValues: string[];
  onToggleOption: (value: string) => void;
  onSaveMultiSelect: () => void;
  onSelectSingle: (colKey: string, value: string) => void;
  singleSelectedValue?: string;
  onDateSelect?: (key: string, value: string[]) => void;
}

const FilterPopover: React.FC<FilterPopoverProps> = ({
  anchorEl,
  open,
  onClose,
  column,
  searchText,
  onSearchTextChange,
  selectedValues,
  onToggleOption,
  onSaveMultiSelect,
  onSelectSingle,
  singleSelectedValue,
  onDateSelect,
}) => {
  if (!column) return null;
  // Use the explicit singleSelectedValue if provided
  const selectedValue = singleSelectedValue || "";
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      className="font-['IBM_Plex_Serif']"
    >
      <div className="min-w-[200px]">
        <div className="p-2">
          <TextField
            size="small"
            fullWidth
            placeholder="Search..."
            value={searchText}
            onChange={e => onSearchTextChange(e.target.value)}
            className="focus:outline-none border-none"
          />
        </div>
        <div>
          {column.filterType === "multiselect"
            ? column.filterOptions
                .filter(option => option.label.toLowerCase().includes(searchText.toLowerCase()))
                .map(option => (
                  <div
                    key={option.value}
                    className={`flex flex-row items-center cursor-pointer px-4 py-[14px] min-w-[200px] hover:bg-[#F5F5F7] ${selectedValues.includes(option.value) ? "bg-[#F5F5F7]" : ""}`}
                    onClick={() => onToggleOption(option.value)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(option.value)}
                      readOnly
                      className="mr-2"
                    />
                    <div>{option.label}</div>
                  </div>
                ))
            : column.filterOptions
                .filter(option => option.label.toLowerCase().includes(searchText.toLowerCase()))
                .map(option => (
                  <div
                    key={option.value}
                    className={`flex flex-row items-center cursor-pointer px-4 py-[14px] min-w-[200px] hover:bg-[#F5F5F7] ${selectedValue === option.value ? "bg-[#F5F5F7]" : ""}`}
                    onClick={() => onSelectSingle(column.key as string, option.value)}
                  >
                    <div>{option.label}</div>
                  </div>
                ))}
          {column.filterType === "date" ? (
            <DateFilterUI
              selectedValues={selectedValues}
              onChange={arr => onToggleOption(JSON.stringify(arr))}
              onDateSelect={value => onDateSelect?.(column.key as string, value)}
            />
          ) : (
            column.filterOptions.filter(option =>
              option.label.toLowerCase().includes(searchText.toLowerCase()),
            ).length === 0 && <div>No options</div>
          )}
        </div>
        {/* Save button for multiselect */}
        {column.filterType === "multiselect" && (
          <div className="flex justify-end p-2">
            <button
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
              onClick={onSaveMultiSelect}
              disabled={selectedValues.length === 0}
            >
              Save
            </button>
          </div>
        )}
      </div>
    </Popover>
  );
};

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
      const first = today.getDate() - today.getDay();
      const last = first + 6;
      const start = new Date(today.setDate(first));
      const end = new Date(today.setDate(last));
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

interface DateFilterUIProps {
  selectedValues: string[];
  onChange: (value: string[]) => void;
  onDateSelect?: (value: string[]) => void;
}

const DateFilterUI = ({ selectedValues, onChange, onDateSelect }: DateFilterUIProps) => {
  const [range, setRange] = React.useState<CalendarValue>(
    selectedValues[0] && selectedValues[1]
      ? [new Date(selectedValues[0]), new Date(selectedValues[1])]
      : null,
  );
  const [custom, setCustom] = React.useState(false);

  const handlePreset = (preset: (typeof quickPresets)[0]) => {
    const [start, end] = preset.getRange();
    if (start && end) {
      setRange([start, end]);
      const arr = [start.toISOString(), end.toISOString()];
      onChange(arr);
    } else {
      setRange(null);
    }
    setCustom(preset.label === "Custom");
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
    <div className="p-2">
      <div className="grid grid-cols-2 gap-2 mb-2">
        {quickPresets.map(preset => (
          <button
            key={preset.label}
            className="border rounded px-2 py-1 hover:bg-gray-100"
            onClick={() => handlePreset(preset)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-2">
        <input
          className="border rounded px-2 py-1 w-full"
          placeholder="Starting"
          value={
            Array.isArray(range) && range[0] instanceof Date ? range[0].toLocaleDateString() : ""
          }
          readOnly
        />
        <input
          className="border rounded px-2 py-1 w-full"
          placeholder="Ending"
          value={
            Array.isArray(range) && range[1] instanceof Date ? range[1].toLocaleDateString() : ""
          }
          readOnly
        />
      </div>
      {custom && (
        <ReactCalendar
          selectRange
          value={range}
          onChange={handleCalendarChange}
          className="w-full"
        />
      )}
      <div className="flex justify-end mt-2">
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default FilterPopover;
