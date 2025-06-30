"use client";

import { FC, useState, useEffect } from "react";
import { Autocomplete, TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
  initialValue?: string;
  suggestions?: string[];
}

const SearchBar: FC<SearchBarProps> = ({ onSearch, initialValue = "", suggestions = [] }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  useEffect(() => {
    if (initialValue?.length > 0) {
      setSearchTerm(initialValue);
    }
  }, [initialValue]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(searchTerm);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const renderSuggestionCard = (
    props: any,
    option: string,
    { selected }: { selected: boolean },
  ) => {
    return (
      <li
        {...props}
        className={`flex items-center h-12 sm:text-[16px] text-[14px] font-['IBM_Plex_Serif'] font-serif text-[#555] cursor-pointer pl-4 transition-colors ${
          selected ? "bg-[#fafafa]" : "bg-white"
        }`}
      >
        <SearchIcon className="mr-2 text-[#888]" />
        {option}
      </li>
    );
  };

  const renderInput = (params: any) => {
    return (
      <TextField
        {...params}
        variant="outlined"
        placeholder="Search"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="font-['IBM_Plex_Serif'] text-[16px] h-[40px] sm:h-[56px]"
        sx={{
          "& .MuiOutlinedInput-root": {
            height: { xs: "40px", sm: "56px" },
            fontFamily: "IBM_Plex_Serif",
            fontSize: { xs: "16px", sm: "18px" },
            "& fieldset": {
              border: "0.5px solid #D6D7DB",
              borderRadius: "8px",
            },
            "&:hover fieldset": {
              border: "0.5px solid #D6D7DB",
            },
            "&.Mui-focused fieldset": {
              border: "0.5px solid #D6D7DB",
            },
          },
          backgroundColor: "#FFF",
        }}
        InputProps={{
          ...params.InputProps,
          startAdornment: (
            <>
              <InputAdornment position="start">
                <SearchIcon className="ml-[6px]" />
              </InputAdornment>
              {params.InputProps.startAdornment}
            </>
          ),
        }}
      />
    );
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Autocomplete
        freeSolo
        id="free-solo-2-demo"
        options={suggestions}
        className="w-full h-[36px] sm:h-[60px]"
        value={searchTerm}
        onChange={(_, newValue) => {
          setSearchTerm(newValue || "");
          if (newValue) onSearch(newValue);
        }}
        renderOption={renderSuggestionCard}
        renderInput={renderInput}
      />
    </form>
  );
};

export default SearchBar;
