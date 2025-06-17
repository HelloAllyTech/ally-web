import { FC, useState } from 'react';

import { DropdownProps } from './types';

const Dropdown: FC<DropdownProps> = ({ options, handleChange, className }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const getOptions = () => {
    return options.filter((option) =>
      option.toLowerCase().trim().includes(searchQuery.toLowerCase().trim())
    );
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div
      className={`p-2 absolute bg-white border border-[#DBDBDB] rounded-[8px] z-50 ${className}`}
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
  );
};

export default Dropdown;
