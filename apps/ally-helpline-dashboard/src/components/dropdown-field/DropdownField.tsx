import { FC, useState } from "react";
import ExpandMore from "@mui/icons-material/ExpandMore";

import { DropdownFieldProps } from "./types";

const DropdownField: FC<DropdownFieldProps> = ({ label, value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleChange = (value: string) => {
    onChange(value);
    setIsOpen(false);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const getOptions = () => {
    return options.filter((option) => option.toLowerCase().trim().includes(searchQuery.toLowerCase().trim()));
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        {label && <span>{label}</span>}
        <span>{value}</span>
        <ExpandMore className="w-4 h-4 cursor-pointer" onClick={() => setIsOpen(true)} />
      </div>
      {isOpen && (
        <div
          className="p-2 absolute top-0 right-[-130px] bg-white border border-[#DBDBDB] rounded-[8px] z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search"
            className="w-full mb-2 px-2 py-1 rounded-[4px] bg-[#F5F5F7] border border-[#DBDBDB]"
          />
          <div className="flex flex-col gap-2 h-[140px] overflow-y-auto">
            {getOptions().map((option) => (
              <span
                key={option}
                onClick={() => handleChange(option)}
                className="cursor-pointer"
              >
                {option}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DropdownField;
