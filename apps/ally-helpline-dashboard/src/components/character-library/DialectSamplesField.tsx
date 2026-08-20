import React from "react";

import { Delete } from "@assets";
import { characterLibraryStrings as strings } from "@constants";

interface DialectSamplesFieldProps {
  samples: string[];
  onChange: (samples: string[]) => void;
  maxCount?: number;
}

/** Repeatable list of sample lines in the character's dialect/voice. */
export const DialectSamplesField: React.FC<DialectSamplesFieldProps> = ({
  samples,
  onChange,
  maxCount = 20,
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

  return (
    <div className="flex flex-col gap-2 w-full">
      {samples.map((sample, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={sample}
            onChange={e => handleSampleChange(index, e.target.value)}
            placeholder={strings.dialectSamplePlaceholder}
            className="flex-1 text-base border-b border-border-light focus:outline-none focus:border-primary-500 py-1 bg-transparent"
          />
          <button
            type="button"
            onClick={() => handleRemoveSample(index)}
            className="p-1 hover:bg-surface-100 rounded transition-colors"
            aria-label={`Remove dialect sample ${index + 1}`}
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>
      ))}

      {samples.length < maxCount ? (
        <button
          type="button"
          onClick={handleAddSample}
          className="self-start text-sm text-primary hover:text-primary-700"
        >
          + {strings.addDialectSample}
        </button>
      ) : (
        <span className="text-destructive-500 text-xs">* {strings.dialectSampleLimit}</span>
      )}
    </div>
  );
};
