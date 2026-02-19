"use client";

import { FC, useState, useId } from "react";

import { motion } from "framer-motion";

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
  const uniqueId = useId();

  const handleChange = (index: number) => {
    setSelectedValueIndex(index);
    onChange(items[index].value);
  };
  return (
    <div className="flex flex-col gap-2 w-fit">
      {label && <div>{label}</div>}
      <div className="flex gap-2 rounded-full border-[0.5px] bg-[#F3F3F3] relative p-1">
        {items.map((item, index) => {
          const isSelected = selectedValue === index;
          return (
            <div
              key={item.value}
              className="relative rounded-full py-1.5 px-4 cursor-pointer transition-colors duration-200 font-primary font-normal text-sm"
              onClick={() => handleChange(index)}
              style={{
                color: isSelected ? "#000000" : "#00000060",
              }}
            >
              {isSelected && (
                <motion.div
                  layoutId={`toggle-pill-${uniqueId}`}
                  className="absolute inset-0 rounded-full bg-[#FFFFFF]"
                  style={{
                    boxShadow: "0px 1px 4px rgba(0, 0, 0, 0.1)",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10 whitespace-nowrap">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Toggle;
