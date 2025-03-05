import { FunctionComponent } from "react";
import CallLogsTable from "./CallLogsTable";

// TODO: Update call history component
const Calls: FunctionComponent = () => {
  return (
    <div className='ml-72 p-6 h-full'>
      <CallLogsTable />
    </div>
  );
};

export default Calls;
