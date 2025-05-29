import { FC, useState, useRef, useEffect } from "react";
import PlayArrow from "@mui/icons-material/PlayArrow";
import { DropdownFieldProps } from "./types";

const DropdownField: FC<DropdownFieldProps> = ({ disabled, label, value, onChange, options, valueClassName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="w-full relative" ref={dropdownRef}>
      <div className="w-full flex gap-2 items-center">
        {label && <span>{label}</span>}
        <span className={valueClassName}>{value}</span>
        {!disabled && (
            <PlayArrow className="w-4 h-4 cursor-pointer rotate-90" onClick={() => setIsOpen((prev) => !prev)} />
        )}
      </div>
      {isOpen && (
        <div
          className="p-2 absolute top-5 left-0 bg-white border border-[#DBDBDB] rounded-[8px] z-50"
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
