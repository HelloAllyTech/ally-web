"use client";

import { FC, useRef, useState } from "react";

interface ToggleProps {
  label?: string;
  items: {
    label: string;
    value: string;
  }[];
  onChange: (value: string) => void;
  initialValue?: string;
}

const Toggle: FC<ToggleProps> = ({ label, items, initialValue, onChange }) => {
  const [selectedValue, setSelectedValueIndex] = useState(
    initialValue ? items.findIndex(item => item.value === initialValue) : 0,
  );
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleChange = (index: number) => {
    setSelectedValueIndex(index);
    onChange(items[index].value);
  };

  /**
   * Roving keyboard navigation for the radio group: arrow keys move the
   * selection (and focus) between options, Home/End jump to the ends.
   */
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (index + 1) % items.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (index - 1 + items.length) % items.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    handleChange(nextIndex);
    buttonRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex flex-col gap-2 w-fit">
      {label && <div>{label}</div>}
      <div
        role="radiogroup"
        aria-label={label}
        className="flex gap-2 rounded-full border-[0.5px] bg-[#F3F3F3] relative"
      >
        <div
          className={`transition-all duration-200 absolute top-0 w-1/2 h-full rounded-full bg-white pointer-events-none ${
            selectedValue === 0
              ? "left-0 shadow-[3px_0px_9px_0px_#00000012]"
              : "left-1/2 shadow-[-7px_0px_9px_0px_#00000012]"
          }`}
        />

        {items.map((item, index) => {
          const isSelected = selectedValue === index;
          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              ref={el => (buttonRefs.current[index] = el)}
              onClick={() => handleChange(index)}
              onKeyDown={event => handleKeyDown(event, index)}
              className={`rounded-full py-2 px-4 cursor-pointer z-10 transition-all duration-200 font-primary font-normal text-sm bg-transparent border-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                isSelected ? "text-black" : "text-black/40"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Toggle;
