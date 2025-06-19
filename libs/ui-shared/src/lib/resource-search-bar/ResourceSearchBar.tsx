'use client';

import { FC, useState, useEffect } from 'react';
import { Autocomplete, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
  initialValue?: string;
  suggestions?: string[];
}

const SearchBar: FC<SearchBarProps> = ({ onSearch, initialValue = '', suggestions = [] }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);

  useEffect(() => {
    if (initialValue?.length > 0) {
      setSearchTerm(initialValue);
    }
  }, [initialValue]);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onSearch(searchTerm);
    }
  };

  const renderSuggestionCard = (props: any, option: string, { selected }: { selected: boolean }) => {
    return (
      <li
        {...props}
        className={`flex items-center h-12 text-[14px] font-serif text-[#555] cursor-pointer pl-4 transition-colors ${selected ? 'bg-[#fafafa]' : 'bg-white'}`}
      >
        <SearchIcon className="mr-2 text-[#888]" />
        {option}
      </li>
    );
  };

  const renderInput = (params: any) => {
    return <TextField
      {...params}
      variant="outlined"
      placeholder="Search"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onKeyDown={handleKeyPress}
      className="font-['IBM_Plex_Serif'] text-[16px]"
      sx={{
        '& .MuiOutlinedInput-root': {
          height: '40px',
          '& fieldset': {
            border: '0.5px solid #D6D7DB',
            borderRadius: '8px',
          },
          '&:hover fieldset': {
            border: '0.5px solid #D6D7DB',
          },
          '&.Mui-focused fieldset': {
            border: '0.5px solid #D6D7DB',
          },
        },
        backgroundColor: '#FFF',
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
  };

  return (
    <Autocomplete
      freeSolo
      id="free-solo-2-demo"
      options={suggestions}
      className="w-full h-[40px]"
      value={searchTerm}
      onChange={(_, newValue) => {
        setSearchTerm(newValue || '');
        if (newValue) onSearch(newValue);
      }}
      renderOption={renderSuggestionCard}
      renderInput={renderInput}
    />
  );
};

export default SearchBar;
