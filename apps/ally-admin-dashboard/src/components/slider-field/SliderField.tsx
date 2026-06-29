import { UseFormReturn, useController } from "react-hook-form";

interface SliderFieldProps {
  id: string;
  label: string;
  formMethods: UseFormReturn<any>;
  min?: number;
  max?: number;
  step?: number;
  /** Initial value used when the form has no stored value for this field. */
  defaultValue?: number;
  isMandatory?: boolean;
  note?: string;
}

const DEFAULT_MIN = 0;
const DEFAULT_MAX = 2;
const DEFAULT_STEP = 0.1;

export const SliderField = ({
  id,
  label,
  formMethods,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  step = DEFAULT_STEP,
  defaultValue,
  isMandatory,
  note,
}: SliderFieldProps) => {
  // Seed the controller's default so a brand-new simulation (no form reset)
  // still carries an explicit value and the slider renders pre-filled.
  const seededDefault = Number.isFinite(Number(defaultValue)) ? Number(defaultValue) : min;

  const {
    field: { value, onChange },
  } = useController({
    name: id,
    control: formMethods.control,
    defaultValue: seededDefault,
  });

  const numericValue = Number.isFinite(Number(value)) ? Number(value) : seededDefault;

  return (
    <div className="flex flex-col gap-3 py-2 w-full">
      <div className="flex items-center justify-between">
        <label className="text-typography-900 text-base flex items-center gap-1">
          {label} {isMandatory && <span className="text-destructive-500">*</span>}
        </label>
        <span className="text-primary-600 text-base font-medium tabular-nums">
          {numericValue.toFixed(1)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={numericValue}
        onChange={e => onChange(parseFloat(e.target.value))}
        aria-label={label}
        className="w-full accent-primary-500 cursor-pointer"
      />
      <div className="flex justify-between text-typography-500 text-sm">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {note && <span className="text-typography-500 text-sm">{note}</span>}
    </div>
  );
};
