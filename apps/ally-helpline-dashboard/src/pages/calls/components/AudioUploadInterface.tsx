import { FC, useEffect, useRef, useState } from "react";

import WavesurferPlayer from "@wavesurfer/react";
import WaveSurfer from "wavesurfer.js";

import { Delete, FileUpload, PauseIcon, PlayIcon } from "@assets";
import { DraggableArea } from "@components";

import { AUDIO_UPLOAD_SIZE_IN_BYTES, audioUploadExtensions } from "./constants";
import { AudioUploadInterfaceProps } from "./types";

const AudioUploadInterface: FC<AudioUploadInterfaceProps> = ({
  duration,
  files,
  setDuration,
  onDropSuccess,
  onDeleteClick,
}) => {
  const [isDropping, setIsDropping] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSec, setCurrentSec] = useState<number>(0);
  const [isWaveformLoading, setIsWaveformLoading] = useState<boolean>(false);

  const progressTimerRef = useRef<number | null>(null);

  const audioFile = files[0];

  // Show loader if waveform takes too long to load (> 3 seconds)
  useEffect(() => {
    if (audioUrl && !wavesurfer) {
      const loadingTimer = window.setTimeout(() => {
        setIsWaveformLoading(true);
      }, 3000);

      return () => clearTimeout(loadingTimer);
    }
    return undefined;
  }, [audioUrl, wavesurfer]);

  // Start a fast progress timer when dropping begins (isDropping === 0)
  useEffect(() => {
    if (isDropping === 0 && progressTimerRef.current === null) {
      progressTimerRef.current = window.setInterval(() => {
        setIsDropping(prev => {
          if (prev === null) return prev;
          const current = typeof prev === "number" ? prev : 0;
          const next = Math.min(current + 3, 100);
          if (next === 100 && progressTimerRef.current !== null) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
            return null;
          }
          return next;
        });
      }, 40);
    }

    return () => {
      // Cleanup on unmount
      if (progressTimerRef.current !== null && isDropping === null) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isDropping]);

  // Ensure interval cleared on unmount regardless
  useEffect(() => {
    return () => {
      if (progressTimerRef.current !== null) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, []);

  // Subscribe to wavesurfer time updates
  useEffect(() => {
    if (!wavesurfer) return () => {};

    const handleProcess = (t: number) => setCurrentSec(t || 0);
    const handleSeek = (p: number) => setCurrentSec((p || 0) * (wavesurfer.getDuration() || 0));

    wavesurfer.on("timeupdate", handleProcess);
    wavesurfer.on("interaction", handleSeek);

    return () => {
      wavesurfer.un("timeupdate", handleProcess);
      wavesurfer.un("interaction", handleSeek);
    };
  }, [wavesurfer]);

  const onDropAccepted = (files: File[]) => {
    onDropSuccess(files);
    setAudioUrl(URL.createObjectURL(files[0]));
    setIsDropping(0);
  };

  const onAudioReady = (wavesurfer: WaveSurfer) => {
    setWavesurfer(wavesurfer);
    setIsWaveformLoading(false);
    setDuration(wavesurfer.getDuration() || 0);
  };

  const onPlayClick = () => {
    setIsPlaying(true);
    wavesurfer.play();
  };

  const onPauseClick = () => {
    setIsPlaying(false);
    wavesurfer.pause();
  };

  const formatTime = (s: number) => {
    const hr = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${hr > 0 ? `${hr}:` : ""}${minutes}:${seconds}`;
  };

  const getFileSize = () => {
    return (audioFile?.size / 1000000).toFixed(2);
  };

  const onAudioDelete = () => {
    setAudioUrl(null);
    setWavesurfer(null);
    setIsPlaying(false);
    setCurrentSec(0);
    setDuration(0);
    onDeleteClick();
  };

  const getFileUploadSection = () => {
    if (files.length > 0) {
      if (typeof isDropping === "number" && isDropping < 100) {
        return (
          <div className="flex gap-5 w-full border-[0.5px] border-[#D2D2D2] rounded-[8px] p-6">
            <FileUpload />
            <div className="flex flex-col gap-2 flex-1 font-primary">
              <span className="text-[#000000DE] text-sm">Uploading your audio file</span>
              <div className="w-full h-2 bg-[#EDEDED] rounded">
                <div
                  className="h-2 bg-[#000000] rounded"
                  style={{ width: `${isDropping}%`, transition: "width 40ms linear" }}
                />
              </div>
            </div>
            <span className="text-[#656565] text-[10px]">{`${isDropping}%`}</span>
          </div>
        );
      }
      return (
        <div className="w-full flex flex-col gap-[10px]">
          <div className="flex gap-5 items-center w-full border-[0.5px] border-[#D2D2D2] rounded-[8px] px-6">
            <div
              className={`w-10 h-10 rounded-full ${isPlaying ? "bg-[#E2F2FF]" : "bg-[#F5F5F5]"} cursor-pointer grid place-items-center`}
            >
              {isPlaying ? (
                <PauseIcon className="text-primary-500" onClick={onPauseClick} />
              ) : (
                <PlayIcon className="text-[#757575]" onClick={onPlayClick} />
              )}
            </div>
            <span className="text-xs text-[#656565] min-w-[36px]">{formatTime(currentSec)}</span>
            <div className="relative flex-1">
              <WavesurferPlayer
                url={audioUrl}
                height={100}
                width={300}
                waveColor="#D2D2D2"
                barGap={4}
                barWidth={2}
                onFinish={() => setIsPlaying(false)}
                onReady={onAudioReady}
                progressColor="#0957D0"
                cursorColor="transparent"
              />
              {isWaveformLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#D2D2D2] border-t-[#0957D0] rounded-full animate-spin" />
                    <span className="text-xs text-[#656565]">Loading waveform...</span>
                  </div>
                </div>
              )}
            </div>
            <span className="text-xs text-[#656565] min-w-[36px] ml-auto">
              {formatTime(duration)}
            </span>
          </div>
          <div className="flex gap-2 w-full justify-between items-center font-primary">
            <div className="flex gap-2 items-center">
              <span className="text-xs text-black">{audioFile?.name}</span>
              <span className="text-[10px] text-[#424242] bg-[#F5F5F5] rounded-[2px] p-1">
                {getFileSize()} MB
              </span>
            </div>
            <Delete className="text-[#F93535] cursor-pointer" onClick={onAudioDelete} />
          </div>
        </div>
      );
    } else {
      return (
        <DraggableArea
          onDropAccepted={onDropAccepted}
          onDropRejected={() => {}}
          sizeInBytes={AUDIO_UPLOAD_SIZE_IN_BYTES}
          supportedExtensions={audioUploadExtensions}
        />
      );
    }
  };

  return <>{getFileUploadSection()}</>;
};

export default AudioUploadInterface;
