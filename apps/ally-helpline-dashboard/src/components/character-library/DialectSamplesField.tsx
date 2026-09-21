import React from "react";

import { Delete } from "@assets";
import { characterLibraryStrings as strings } from "@constants";

interface DialectSamplesFieldProps {
  samples: string[];
  onChange: (samples: string[]) => void;
  maxCount?: number;
  /** Locks every sample and drops the add/remove controls. */
  readOnly?: boolean;
}

/** Repeatable list of sample lines in the character's dialect/voice. */
export const DialectSamplesField: React.FC<DialectSamplesFieldProps> = ({
  samples,
  onChange,
  maxCount = 20,
  readOnly = false,
}) => {
  const handleSampleChange = (index: number, value: string) => {
    onChange(samples.map((sample, i) => (i === index ? value : sample)));
  };

  const handleRemoveSample = (index: number) => {
    onChange(samples.filter((_, i) => i !== index));
  };

  const handleAddSample = () => {
    onChange([...samples, ""]);
  };

  if (readOnly && samples.length === 0) {
    return <span className="text-typography-500 text-base">—</span>;
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      {samples.map((sample, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={sample}
            onChange={e => handleSampleChange(index, e.target.value)}
            placeholder={strings.dialectSamplePlaceholder}
            readOnly={readOnly}
            className="flex-1 text-base border-b border-border-light focus:outline-none focus:border-primary-500 py-1 bg-transparent"
          />
          {!readOnly && (
            <button
              type="button"
              onClick={() => handleRemoveSample(index)}
              className="p-1 hover:bg-surface-100 rounded transition-colors"
              aria-label={`Remove dialect sample ${index + 1}`}
            >
              <Delete className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}

      {/* Hitting a cap isn't an error, and hiding the button on the way made
          it look like the control had broken. Keep it in place, disabled,
          with the cap stated plainly. */}
      {!readOnly && (
        <>
          <button
            type="button"
            onClick={handleAddSample}
            disabled={samples.length >= maxCount}
            className="self-start text-sm text-primary hover:text-primary-700 disabled:cursor-not-allowed disabled:text-typography-500 disabled:hover:text-typography-500"
          >
            + {strings.addDialectSample}
          </button>
          {samples.length >= maxCount && (
            <span className="text-typography-600 text-xs">{strings.dialectSampleLimit}</span>
          )}
        </>
      )}
    </div>
  );
};
