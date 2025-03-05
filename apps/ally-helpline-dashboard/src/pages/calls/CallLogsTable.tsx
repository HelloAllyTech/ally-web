import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';

import { COLOR_PALETTE, DEFAULT_TAGS, TABLE_HEADERS } from './constants';
import { useGetCallLogsQuery } from './api';
import { convertMinutesToDuration, formatDate, getRandomValue } from './utils';

const CallLogsTable = () => {
  const { data, isLoading } = useGetCallLogsQuery('');
  console.log(data)
  if (isLoading) {
    return <div className='flex justify-center items-center h-[calc(100%_-_80px)]'><CircularProgress /></div>
  }
  

  const getDisplayData = (row: { [key: string]: any }) => {
    const { details, id, startedAt, } = row;
    let previousVal = '';
    if (details) {
      const { callDuration = 30, callQuality = 60, chatId, startTime, tags = DEFAULT_TAGS } = details;

      return {
        id: chatId,
        dateAndTime: formatDate(startTime),
        duration: convertMinutesToDuration(callDuration ?? 60),
        capsuleColor: getRandomValue(COLOR_PALETTE, previousVal),
        quality_score: callQuality ?? 70,
        tags: (tags ?? DEFAULT_TAGS).map((tag: string) => {
          const capsuleColor= getRandomValue(COLOR_PALETTE, previousVal);
          return { label: tag, capsuleColor }
        })
      }
    }
    return {
      id,
      dateAndTime: formatDate(startedAt),
      duration: convertMinutesToDuration(30),
      quality_score: '50',
      tags: (DEFAULT_TAGS).map((tag: string) => {
        const capsuleColor= getRandomValue(COLOR_PALETTE, previousVal);
        return { label: tag, capsuleColor }
      })
    }
  }
  const getWidth = (percentage: number) => {
    return percentage / 100 * 128
  }
  return (
    <div className='bg-white rounded-xl shadow-md w-full'>
      <Table sx={{ minWidth: '100%' }} aria-label="simple table">
        <TableHead sx={{ backgroundColor: '#F5F5F5' }}>
          <TableRow>
            {TABLE_HEADERS.map((header) => (
              <TableCell key={header.id}>{header.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data?.map((row: { [key: string]: any }) => {
            const displayData = getDisplayData(row);
            return (
              <TableRow key={displayData.id}>
                {TABLE_HEADERS.map((header) => (
                  <TableCell key={header.id}>
                    {header.id === 'tags' && <div className='flex gap-2'>
                      {displayData.tags.map((tag: { label: string, capsuleColor: string }) => (
                        <div style={{ backgroundColor: tag.capsuleColor }} className='rounded-md px-2 py-1 text-white text-xs'>
                          {tag.label}
                        </div>
                      ))}</div>}
                    {header.id === 'quality_score' && <div className='flex items-center gap-3'>
                      <label>{displayData.quality_score}</label>
                      <div className='flex gap-1 w-32 h-1'>
                        <div style={{ width: `${getWidth(displayData.quality_score)}px`}} className={`border-[2px] border-[#6272FF] rounded-md`} />
                        <div style={{ width: `${getWidth(100 - displayData.quality_score)}px`}} className={`border-[2px] border-t-[#E6F2FF] rounded-md`}  />
                      </div>
                    </div>}
                    {header.id !== 'tags' && header.id !== 'quality_score' && displayData[header.id]}
                  </TableCell>
                ))}
              </TableRow>
            );
          }
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export default CallLogsTable;
