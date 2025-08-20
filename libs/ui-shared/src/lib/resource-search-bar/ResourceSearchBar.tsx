"use client";

import { FC, useState, useEffect } from "react";

import SearchIcon from "@mui/icons-material/Search";
import { Autocomplete, TextField, InputAdornment } from "@mui/material";
import { X } from "lucide-react";

import { SearchVariant } from "@ally-ui-mono/ui-shared/types";

import { searchBarStyles } from "./constants";

/**
 * Props for SearchBar component.
 */

export interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
  initialValue?: string;
  suggestions?: string[];
  mode?: SearchVariant;
}

const MAX_CHARACTER_LIMIT = 150;

/**
 * SearchBar component provides a search input with suggestions and autocomplete.
 * @component
 * @param {SearchBarProps} props - Props for SearchBar
 */
const SearchBar: FC<SearchBarProps> = ({
  onSearch,
  initialValue = "",
  suggestions = [],
  mode = SearchVariant.LIGHT,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  useEffect(() => {
    if (initialValue?.length > 0) {
      setSearchTerm(initialValue);
    }
  }, [initialValue]);

  /**
   * Handles form submission and triggers the onSearch callback.
   * @param {React.FormEvent} event
   */
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(searchTerm);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  /**
   * Renders a option card for the autocomplete dropdown.
   */
  const renderOptionCard = (props: any, option: string, { selected }: { selected: boolean }) => {
    return (
      <li
        {...props}
        className={`flex items-center h-12 sm:text-[16px] text-[14px] font-['IBM_Plex_Serif'] text-[#555] cursor-pointer pl-4 transition-colors 
          ${selected ? "bg-[#fafafa]" : searchBarStyles[mode].optionCard}`}
      >
        <SearchIcon className="mr-2 text-[#888]" />
        {option}
      </li>
    );
  };

  /**
   * Renders the search input field.
   */
  const renderInput = (params: any) => {
    return (
      <TextField
        {...params}
        variant="outlined"
        placeholder="Need guidance? Search here.."
        value={searchTerm}
        maxLength={MAX_CHARACTER_LIMIT}
        onChange={e => setSearchTerm(e.target.value.slice(0, MAX_CHARACTER_LIMIT))}
        className={`font-['IBM_Plex_Serif'] text-[16px] ${searchBarStyles[mode].textFieldHeight}`}
        sx={{
          borderRadius: "8px",
          overflow: "hidden",
          border: searchBarStyles[mode].border,
          "& .MuiOutlinedInput-root": {
            height: searchBarStyles[mode].rootHeight,
            fontFamily: "IBM_Plex_Serif",
            fontSize: { xs: "16px", sm: "18px" },
            "& input": {
              color: searchBarStyles[mode].color,
            },
            "& fieldset": {
              border: searchBarStyles[mode].border,
              borderRadius: "8px",
            },
            "&:hover fieldset": {
              border: searchBarStyles[mode].border,
            },
            "&.Mui-focused fieldset": {
              border: searchBarStyles[mode].border,
            },
          },
          "& .MuiInputBase-input::placeholder": {
            color: searchBarStyles[mode].placeholderColor,
          },
          backgroundColor: searchBarStyles[mode].backgroundColor,
        }}
        InputProps={{
          ...params.InputProps,
          maxLength: MAX_CHARACTER_LIMIT,
          startAdornment: (
            <>
              <InputAdornment position="start">
                <SearchIcon className={`ml-[6px] ${searchBarStyles[mode].searchIcon}`} />
              </InputAdornment>
              {params.InputProps.startAdornment}
            </>
          ),
          endAdornment: searchTerm && params.InputProps.endAdornment,
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
        clearIcon={<X width={16} height={16} stroke={searchBarStyles[mode].clearIcon} />}
        value={searchTerm}
        onChange={(_, newValue) => {
          const limitedValue = newValue ? newValue.slice(0, MAX_CHARACTER_LIMIT) : "";
          setSearchTerm(limitedValue);
          if (limitedValue) onSearch(limitedValue);
        }}
        renderOption={renderOptionCard}
        renderInput={renderInput}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "0px 0px 8px 8px",
              overflow: "hidden",
              backgroundColor: searchBarStyles[mode].backgroundColor,
              "& .MuiAutocomplete-listbox": {
                padding: "0px !important",
              },
            },
          },
        }}
      />
    </form>
  );
};

export default SearchBar;
