import { useEffect, useState } from "react";
import { LiveAudioVisualizer, AudioVisualizer } from "react-audio-visualize";
import { AudioRecorder, useAudioRecorder } from "react-audio-voice-recorder";

import { Modal } from "@mui/material";
import {
  Close,
  Record,
  CutCall,
  FocusOn,
  NoRecord,
  FocusOff,
  BackgroundBottom,
  BackgroundTop,
} from "@/assets/icons";

import "./CallTranscript.css";
interface CallTranscriptProps {
  open: boolean;
  onClose: () => void;
}
const CallTranscript = (props: CallTranscriptProps) => {
  const recorderControls = useAudioRecorder();
  const { startRecording, stopRecording, mediaRecorder } = recorderControls;
  const { open, onClose } = props;
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [focus, setFocus] = useState(false);

  useEffect(() => {
    const secondsInterval = setInterval(() => {
      setSeconds((prev) => {
        if (prev > 59) {
          setMinutes((prevMin) => prevMin + 1);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => {
      clearInterval(secondsInterval);
    };
  }, []);

  const onRecord = () => {
    setRecording(true);
    startRecording();
  };

  const onStopRecord = () => {
    setRecording(false);
    stopRecording();
  };
  return (
    <Modal open={open}>
      <div className="w-full h-full flex justify-center items-center">
        <div className="w-full h-full bg-[#161921] relative flex flex-col gap-10 justify-center items-center">
          <BackgroundTop className="absolute top-0 right-0 opacity-35 z-0" />
          <BackgroundBottom className="absolute bottom-0 left-0 opacity-35 z-0" />
          <div className="flex flex-col justify-center items-center gap-4 z-10">
            <div className="text-white flex justify-center items-center flex-col gap-2">
              <div className="text-base font-medium">Ongoing Voice Call</div>
              <div className="text-sm text-[#BABABA]">
                {minutes > 9 ? minutes : `0${minutes}`}:
                {seconds > 9 ? seconds : `0${seconds}`}
              </div>
            </div>
            {(recording && mediaRecorder && (
              <div className="relative gap-1 flex rounded-lg">
                <div className="rotate-180 z-0 translate-x-[7px]">
                  <LiveAudioVisualizer
                    mediaRecorder={mediaRecorder}
                    width={200}
                    height={200}
                    barWidth={4}
                    barColor="#FFFFFF"
                  />
                </div>
                <div className="z-0">
                  <LiveAudioVisualizer
                    mediaRecorder={mediaRecorder}
                    width={200}
                    height={200}
                    barWidth={4}
                    barColor="#FFFFFF"
                  />
                </div>
                <div className="waveForm rounded-full absolute top-[38%] left-0 w-1/6 h-1/4 " />
                <div className="waveForm rounded-full absolute top-[38%] right-0 w-1/6 h-1/4 rotate-180" />
              </div>
            )) || (
              <div className="relative z-10 rounded-lg">
                <AudioVisualizer
                  blob={new Blob([], { type: "audio/wav" })}
                  width={400}
                  height={200}
                  barWidth={1}
                  gap={0}
                  barColor={"#FFFFFF"}
                />
                <div className="absolute w-[98%] border-dashed border border-[#FFFFFF70] top-[49.5%] left-1" />
                <div className="waveForm rounded-full absolute top-[38%] left-0 w-1/6 h-1/4 " />
                <div className="waveForm rounded-full absolute top-[38%] right-0 w-1/6 h-1/4 rotate-180" />
              </div>
            )}
          </div>
          <div className="z-0 h-0 opacity-0">
            <AudioRecorder recorderControls={recorderControls} />
          </div>
          <div className="z-10 absolute bottom-10 w-full flex justify-center items-center gap-4">
            <button onClick={!recording ? onRecord : onStopRecord}>
              {recording ? <Record /> : <NoRecord />}
            </button>
            <button>
              {focus ? (
                <FocusOn onClick={() => setFocus(false)} />
              ) : (
                <FocusOff onClick={() => setFocus(true)} />
              )}
            </button>
            <button onClick={onClose}>
              <CutCall />
            </button>
          </div>
        </div>
        <div
          style={{ width: focus ? "500px" : "0" }}
          className={"h-full transition-all bg-[#12151F] duration-300}"}
        >
          <div className="border-b border-b-[#292929] h-14 px-4 flex justify-between items-center">
            <div className="font-bold text-white">Copilot</div>
            <Close className="cursor-pointer" onClick={() => setFocus(false)} />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CallTranscript;
