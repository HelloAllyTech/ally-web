export interface SegmentedToggleOption<T extends string = string> {
  label: string;
  value: T;
}

interface SegmentedToggleProps<T extends string = string> {
  value: T;
  options: readonly SegmentedToggleOption<T>[];
  onChange: (value: T) => void;
  label?: string;
}

export const SegmentedToggle = <T extends string = string>({
  value,
  options,
  onChange,
  label = "Segmented toggle",
}: SegmentedToggleProps<T>) => {
  return (
    <div
      className="flex items-center gap-1 p-1 rounded-full border border-border-light bg-white"
      role="tablist"
      aria-label={label}
    >
      {options.map(option => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={`px-3 py-1 text-sm font-medium rounded-full transition-colors focus:outline-none ${
              isSelected
                ? "bg-primary-50 text-primary-500"
                : "text-typography-600 hover:text-typography-900"
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
