import { FunctionComponent, useState } from "react";

import { Button } from "@mui/material";

import CallLogsTable from "./CallLogsTable";
import { CallPicker } from "@/components";

const Calls: FunctionComponent = () => {
  const [alertCall, setAlertCall] = useState(true);

  const onAccept = () => {
    setAlertCall(false);
    // TODO: navigate to audio call page
  };
  return (
    <div className="ml-72 p-6 h-full flex flex-col gap-4">
      <div className="bg-[#32315E] text-white p-4 rounded-lg flex justify-between items-center">
        <div>
          Another day, another chance to listen, support, and make a difference
          one call at a time.
        </div>
        <Button
          sx={{
            color: "#027236",
            bgcolor: "#D7FFD7",
            borderRadius: "20px",
            fontSize: "14px",
            textTransform: "capitalize",
          }}
        >
          Mark Available
        </Button>
      </div>
      <CallLogsTable />
      {alertCall && (
        <CallPicker onAccept={onAccept} onDecline={() => setAlertCall(false)} />
      )}
    </div>
  );
};

export default Calls;
