import { useNavigate } from "react-router-dom";
import { Headphones } from "@mui/icons-material";

import { Button } from "@/components/generic/button";
import { ROUTES } from "@/constants/routes";

const StartSession = () => {
  const navigate = useNavigate();

  const onStartSession = () => {
    navigate(`${ROUTES.AUDIO_CALL}?mode=microphone`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="w-[50%] bg-[#F8F8F8] border-[0.5px] border-[#D3D3D3] rounded-[6px] p-2 text-center">
        <div
          className="flex flex-col items-center justify-center gap-8 bg-white rounded-[6px] mb-4 p-8 
            border-[0.5px] border-[#D3D3D3] shadow-[8.52px_11.36px_14.2px_0px_rgba(160,158,158,0.09)]"
        >
          <div className="text-[44px] font-['Replay_Pro']">
            <span className="text-[#000000]">Start </span>
            <span className="text-[#000000] italic font-bold">Session</span>
          </div>
          <p className="w-[80%] text-center">Join sessions in real-time with Ally. 
            Get live transcriptions, emotional cues, and AI-powered nudges to help you respond with empathy and clarity.
          </p>
          <Button className="bg-[#4C4C4C] hover:bg-[#4C4C4C] flex items-center gap-2" onClick={onStartSession}>
            <Headphones className="w-[24px] h-[24px]" />
            <span className="text-white  text-[24px] font-['IBM_Plex_Serif']">Start</span>
          </Button>
        </div>
        <span className="text-[#656565] text-[14px] rounded=[8px]">
          By starting, you confirm everyone being transcribed has given consent
        </span>
      </div>
    </div>
  );
};

export default StartSession;