import { FC, useState } from 'react';
import { Autocomplete, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
}

const SearchBar: FC<SearchBarProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleKeyPress = (event: React.KeyboardEvent) => {
    console.log(event.key);
    if (event.key === 'Enter') {
      onSearch(searchTerm);
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
