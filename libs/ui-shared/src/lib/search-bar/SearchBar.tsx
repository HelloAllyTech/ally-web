import { FC } from 'react';
import { Autocomplete, TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export interface SearchBarProps {}

const SearchBar: FC<SearchBarProps> = () => {
  return (
    <Autocomplete
      // freeSolo
      id="free-solo-2-demo"
      options={[]}
      // renderOption={undefined}
      className="w-full h-[40px]"
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          placeholder="Search"
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
