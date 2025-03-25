import { Eye } from "lucide-react";
import { useEffect, useState } from "react";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import CircularProgress from "@mui/material/CircularProgress";

import { DEFAULT_TAGS, TABLE_HEADERS, TAG_COLORS } from "./constants";
import { useGetCallLogsQuery } from "./api";
import { convertSecondsToDuration, formatDate } from "./utils";

const CallLogsTable = () => {
  const { data, isLoading } = useGetCallLogsQuery("");
  const [transition, setTransition] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setTimeout(() => {
        setTransition(false);
      }, 100);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100%_-_80px)]">
        <CircularProgress />
      </div>
    );
  }

  const getDisplayData = (row: { [key: string]: any }) => {
    const { details, id, startedAt, clientId } = row;
    if (details) {
      //TODO - change default values
      const {
        callDuration = 30,
        callQuality = 60,
        startTime,
        tags = DEFAULT_TAGS,
      } = details;
      return {
        id,
        clientId,
        dateAndTime: formatDate(startTime),
        duration: convertSecondsToDuration(callDuration ?? 60),
        quality_score: callQuality ?? 70,
        tags: (tags ?? DEFAULT_TAGS).map((tag: { tag: string; positivity_rating: number }) => {
          return {
            label: tag.tag,
            capsuleColor: TAG_COLORS[tag.positivity_rating],
          };
        }),
      };
    }
    return {
      id,
      clientId,
      dateAndTime: formatDate(startedAt),
      duration: convertSecondsToDuration(30),
      quality_score: "50",
      tags: DEFAULT_TAGS.map((tag) => {
        return {
          label: tag.tag,
          capsuleColor: TAG_COLORS[tag.positivity_rating],
        };
      }),
    };
  };

  const getWidth = (percentage: number) => {
    return (percentage / 100) * 128;
  };

  return (
    <div className="bg-white rounded-xl shadow-md w-full">
      <Table sx={{ minWidth: "100%" }} aria-label="simple table">
        <TableHead sx={{ backgroundColor: "#F5F5F5" }}>
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
                    {header.id === "tags" && (
                      <div className="flex gap-2">
                        {displayData.tags.map(
                          (tag: {
                            label: string;
                            capsuleColor: { bg: string; text: string };
                          }) => (
                            <div
                              key={tag.label}
                              style={{
                                backgroundColor: tag.capsuleColor.bg,
                                color: tag.capsuleColor.text,
                              }}
                              className="rounded-md px-2 py-1 text-white text-xs font-medium"
                            >
                              {tag.label}
                            </div>
                          )
                        )}
                      </div>
                    )}
                    {header.id === "quality_score" && (
                      <div className="flex items-center gap-3">
                        <label>{displayData.quality_score}</label>
                        <div className="flex gap-1 w-32 h-1">
                          <div
                            style={{
                              width:
                                !transition &&
                                `${getWidth(displayData.quality_score)}px`,
                            }}
                            className="w-0 transition-all duration-300 border-[2px] border-[#6272FF] rounded-md"
                          />
                          <div
                            style={{
                              width:
                                !transition &&
                                `${getWidth(100 - displayData.quality_score)}px`,
                            }}
                            className="w-full transition-all duration-300 border-[2px] border-t-[#E6F2FF] rounded-md"
                          />
                        </div>
                      </div>
                    )}
                    {header.id === "notes" && (
                      <Eye className="text-[#868686] w-4 h-4 ml-2 cursor-pointer" />
                    )}
                    {header.id !== "tags" &&
                      header.id !== "quality_score" &&
                      displayData[header.id]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default CallLogsTable;
