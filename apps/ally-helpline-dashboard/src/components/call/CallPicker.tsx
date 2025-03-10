import { BackgroundTop, BackgroundBottom, CallCut, CallAttend } from "@/assets/icons";
import { DefaultProfile } from "@/assets/images";

import "./CallPicker.css";

interface CallPickerProps {
  callerName?: string;
  profileImage?: string;
  callType?: string;
  onAccept: () => void;
  onDecline: () => void;
}

const CallPicker = ({
  callerName = "Someone needs your help",
  profileImage = DefaultProfile,
  callType = "Incoming Voice Call",
  onAccept,
  onDecline,
}: CallPickerProps) => {
  return (
    <div className="bg-[#21252E] absolute bottom-6 right-6 h-96 w-80 rounded-lg">
      <div className="relative w-full h-full overflow-hidden rounded-lg py-8 flex items-center flex-col gap-2">
        <BackgroundTop className="absolute top-0 right-0" />
        <BackgroundBottom className="absolute bottom-0 left-0" />
        <div className="flex items-center gap-2 relative w-full h-full flex-col">
          <div className="absolute -top-3.5 left-[76px] rounded-full w-44 h-44 border-[0.63px] border-[#FFFFFF20] ripple">
            <div className="bg-[#CDD4E420] rounded-full m-2 w-40 h-40 ripple"></div>
          </div>
          <img
            src={profileImage}
            alt="avatar"
            className="w-40 object-contain absolute top-[10px] left-[70px] "
          />
          <div className="text-white font-semibold mt-44">{callerName}</div>
          <div className="text-[#BABABA]">{callType}</div>
          <div className="flex mt-4">
            <button onClick={onDecline} aria-label="Decline call">
              <CallCut />
            </button>
            <button onClick={onAccept} aria-label="Accept call">
              <CallAttend />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallPicker;
