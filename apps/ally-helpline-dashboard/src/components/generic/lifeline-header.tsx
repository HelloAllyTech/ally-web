import { useState } from "react";

import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";

import { Lifeline, DefaultAvatar } from "@/assets/icons";

const LifelineHeader = () => {
  const [status, setStatus] = useState("not_available");

  const handleChange = (event: SelectChangeEvent) => {
    setStatus(event.target.value as string);
  };
  return (
    <div className="bg-white border-b border-b-[#E5E7EB] p-4 h-20 py-3 top-0 sticky flex justify-between items-center">
      <Lifeline />
      <div className="flex gap-4 items-center">
        <Select
          value={status}
          sx={{
            ".MuiOutlinedInput-notchedOutline": {
              borderColor: "transparent !important",
            },
          }}
          onChange={handleChange}
          className="border !border-[#E5E7EB] !rounded-[28px] h-10 w-52 hover:!border-[#E5E7EB] focus:!border-[#E5E7EB]"
        >
          <MenuItem value="not_available">
            <div className="flex gap-3 items-center">
              <div className="w-4 h-4 rounded-full m-2 bg-[#C8C8C8]" />
              <div>Not Available</div>
            </div>
          </MenuItem>
          <MenuItem value="available">
            <div className="flex gap-3 items-center">
              <div className="w-4 h-4 rounded-full m-2 bg-[#33BA60]" />
              <div>Available</div>
            </div>
          </MenuItem>
          <MenuItem value="busy">
            <div className="flex gap-3 items-center">
              <div className="w-4 h-4 rounded-full m-2 bg-[#FF7B00] " />
              <div>Busy</div>
            </div>
          </MenuItem>
        </Select>
        <DefaultAvatar />
      </div>
    </div>
  );
};

export default LifelineHeader;
