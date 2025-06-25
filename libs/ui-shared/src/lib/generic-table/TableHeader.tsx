import { Column, TableSort, TableFilter } from './types';
import { Sort, ArrowUpward, ArrowDownward, FilterAlt, FilterAltOff } from '@mui/icons-material';
import React, { useState } from 'react';
import { Popover, TextField, List, ListItem, ListItemButton, ListItemText, IconButton, Tooltip } from '@mui/material';

/**
 * TableHeader renders the table's <thead> with sortable and filterable columns.
 */
function TableHeader<T extends Record<string, any>>({
  columns,
  sort,
  filter,
  onSort,
  onFilterChange,
}: {
  columns: Column<T>[];
  sort: TableSort;
  filter: TableFilter;
  onSort: (key: string) => void;
  onFilterChange: (key: string, value: string) => void;
}) {
  // State to manage which filter popover is open and the search text for each column
  const [anchorEls, setAnchorEls] = useState<{ [key: string]: HTMLElement | null }>({});
  const [searchTexts, setSearchTexts] = useState<{ [key: string]: string }>({});

  const handleFilterButtonClick = (event: React.MouseEvent<HTMLElement>, key: string) => {
    setAnchorEls(prev => ({ ...prev, [key]: event.currentTarget }));
  };

  const handleFilterClose = (key: string) => {
    setAnchorEls(prev => ({ ...prev, [key]: null }));
    setSearchTexts(prev => ({ ...prev, [key]: '' }));
  };

  const handleSearchChange = (key: string, value: string) => {
    setSearchTexts(prev => ({ ...prev, [key]: value }));
  };

  const handleOptionSelect = (key: string, value: string) => {
    onFilterChange(key, value);
    handleFilterClose(key);
  };

  const renderPopover = (col: Column<T>) => {
    if (!col.filterable || !col.filterOptions) return null;
    return (
      <Popover
        open={Boolean(anchorEls[col.key as string])}
        anchorEl={anchorEls[col.key as string]}
        onClose={() => handleFilterClose(col.key as string)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <div className="p-2 min-w-[200px]">
          <TextField
            size="small"
            fullWidth
            placeholder="Search..."
            value={searchTexts[col.key as string] || ''}
            className="focus:outline-none border-none"
            onChange={e => handleSearchChange(col.key as string, e.target.value)}
          />
          <List dense>
            {col.filterOptions
              .filter(option =>
                option.toLowerCase().includes((searchTexts[col.key as string] || '').toLowerCase())
              )
              .map(option => (
                <ListItem key={option} disablePadding>
                  <ListItemButton
                    selected={filter[col.key as string] === option}
                    onClick={() => handleOptionSelect(col.key as string, option)}
                  >
                    <ListItemText primary={option} />
                  </ListItemButton>
                </ListItem>
              ))}
            {col.filterOptions.filter(option =>
              option.toLowerCase().includes((searchTexts[col.key as string] || '').toLowerCase())
            ).length === 0 && (
                <ListItem>
                  <ListItemText primary="No options" />
                </ListItem>
              )}
          </List>
        </div>
      </Popover>
    );
  };

  const renderFilter = (col: Column<T>) => {
    return (
      <>
        {filter[col.key as string] ? (
          <Tooltip title="Clear filter">
            <IconButton
              size="small"
              onClick={() => onFilterChange(col.key as string, '')}
              aria-label="Clear filter"
            >
              <FilterAltOff className="text-black w-[16px] h-[16px] pt-[2px]" />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Filter">
            <IconButton
              size="small"
              onClick={e => handleFilterButtonClick(e, col.key as string)}
              aria-label="Filter"
            >
              <FilterAlt className="text-black w-[16px] h-[16px]" />
            </IconButton>
          </Tooltip>
        )}
        {renderPopover(col)}
      </>
    );
  };

  const renderSort = (col: Column<T>) => {
    return (
      <Tooltip title="Sort">
        <IconButton
          size="small"
          className="focus:outline-none"
          onClick={() => onSort(col.key as string)}
          aria-label="Sort"
        >
          {sort.key === col.key ? (
            sort.direction === 'asc' ? <ArrowUpward className="text-black w-[18px] h-[18px]" /> : sort.direction === 'desc' ? <ArrowDownward className="text-black w-[18px] h-[18px]" /> : ''
          ) : (
            <Sort className="text-black w-[18px] h-[18px]" />
          )}
        </IconButton>
      </Tooltip>
    );
  };

  return (
    <thead className="bg-[#F5F5F5]">
      <tr className="bg-[#F5F5F5] sticky top-0 z-10">
        {columns?.map(col => (
          <th
            key={col.key as string}
            className={`px-4 py-[14px] text-left font-[14px] font-[500] text-[#000] min-w-[100px] text-xs sm:text-sm ${col.className || ''}`}
            style={col.style}
          >
            <div className="flex items-center gap-2">
              <span>{col.header}</span>
              {col.sortable && renderSort(col)}
              {col.filterable && col.filterOptions && renderFilter(col)}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

export default TableHeader; 