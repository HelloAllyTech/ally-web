import { FunctionComponent } from "react";

import { CallPicker } from "@/components";

// TODO: Update call history component
const Calls: FunctionComponent = () => {
  return (
    <div className="ml-72 p-6">
      <CallPicker onAccept={() => {}} onDecline={() => {}} />
    </div>
  );
};

export default Calls;
