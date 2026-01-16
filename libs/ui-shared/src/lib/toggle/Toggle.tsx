import { FC, useState } from "react";

interface ToggleProps {
  label?: string;
  items: {
    label: string;
    value: string;
  }[];
  onChange: (value: string) => void;
}

const Toggle: FC<ToggleProps> = ({ label, items, onChange }) => {
  const [selectedValue, setSelectedValueIndex] = useState(0);
  const handleChange = (index: number) => {
    setSelectedValueIndex(index);
    onChange(items[index].value);
  };
  return (
    <div className="flex flex-col gap-2 rounded-full border-[0.5px] p-2 w-fit shadow-[2.13px_2.84px_7.81px_0px_#A09E9E1A]">
      {label && <div>{label}</div>}
      <div className="flex gap-2 rounded-full border-[0.5px] bg-[#F3F3F3] relative">
        <div
          style={{
            left: selectedValue === 0 ? "0" : "50%",
            boxShadow:
              selectedValue === 0 ? "3px 0px 9px 0px #00000012" : "-7px 0px 9px 0px #00000012",
          }}
          className="transition-all duration-200 absolute top-0 w-1/2 h-full rounded-full bg-[#FFFFFF]"
        />

        {items.map((item, index) => (
          <div
            key={item.value}
            className="rounded-full py-2 px-4 cursor-pointer z-10 transition-all duration-200 font-primary"
            onClick={() => handleChange(index)}
            style={{
              color: selectedValue === index ? "#000000" : "#00000060",
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Toggle;
