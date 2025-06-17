'use client';

import { FC, useState } from 'react';
import { Autocomplete, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useRouter } from 'next/navigation';

export interface SearchBarProps {
  onSearch?: (searchTerm: string) => void;
  initialValue?: string;
}

const SearchBar: FC<SearchBarProps> = ({ onSearch, initialValue = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const router = useRouter();

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (onSearch) {
        onSearch(searchTerm);
      }
      router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <Autocomplete
      freeSolo
      id="free-solo-2-demo"
      options={[]}
      className="w-full h-[40px]"
      value={searchTerm}
      onChange={(_, newValue) => {
        setSearchTerm(newValue || '');
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
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
                  <SearchIcon />
                </InputAdornment>
                {params.InputProps.startAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default SearchBar;
