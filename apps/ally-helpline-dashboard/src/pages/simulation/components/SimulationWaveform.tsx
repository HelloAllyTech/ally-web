import { FC, useMemo } from "react";

import { useRemoteParticipants } from "@livekit/components-react";
import { Track } from "livekit-client";

import { audioLevelConfig, LOCAL_STORAGE_KEYS } from "@constants";
import { useAudioLevel } from "@hooks";

import { circleList, circleStyles } from "./constants";
import { AudioTrackRef, CircleProps } from "./types";

const Circle: FC<CircleProps> = ({ circleNumber, config, audioLevel }) => {
  const { scale, isStatic } = config;
  const { BASE_SIZE, BORDER, MIN_SCALE, TRANSITION_MS, BACKGROUND_COLOR } = circleStyles;

  const isActive = audioLevel > audioLevelConfig.threshold;
  const circleScale = scale * (isStatic ? 1 : MIN_SCALE + (audioLevel * circleNumber) / 3);

  const styles = useMemo(
    () => ({
      width: `${BASE_SIZE}px`,
      height: `${BASE_SIZE}px`,
      transform: `scale(${circleScale})`,
      background: BACKGROUND_COLOR,
      transitionDuration: `${TRANSITION_MS}ms`,
      border: `${isStatic && isActive ? BORDER.WIDTH : 0}px solid ${BORDER.COLOR}`,
      opacity: isActive ? `${scale * 10}%` : 0,
    }),
    [isStatic, isActive, circleScale],
  );

  return <div className="absolute rounded-full transition-all" style={styles} />;
};

const CircleWaveVisualizer = ({ trackRef }: { trackRef: AudioTrackRef }) => {
  const audioLevel = useAudioLevel(trackRef.publication?.track?.mediaStreamTrack);

  const imageUrl = localStorage.getItem(LOCAL_STORAGE_KEYS.ROOM_DATA)
    ? JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.ROOM_DATA) || "{}")?.coverImageUrl
    : null;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Speaker avatar"
          className="z-10 rounded-full object-cover w-[120px] h-[120px] sm:w-[100px] sm:h-[100px] md:w-[120px] md:h-[120px]"
          loading="lazy"
        />
      ) : null}
      {circleList.map((config, index) => (
        <Circle key={index} circleNumber={index} config={config} audioLevel={audioLevel} />
      ))}
    </div>
  );
};

const SimulationWaveform: FC = () => {
  const remoteParticipants = useRemoteParticipants();
  const remoteParticipant = remoteParticipants.length > 0 ? remoteParticipants[0] : null;
  const audioPublication = remoteParticipant
    ?.getTrackPublications()
    .find(pub => pub.kind === Track.Kind.Audio);

  return (
    <div className="flex justify-center items-center w-[90%] sm:w-[60%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%] h-[70vh]">
      <CircleWaveVisualizer
        trackRef={{
          participant: remoteParticipant,
          source: Track.Source.Microphone,
          publication: audioPublication,
        }}
      />
    </div>
  );
};

export default SimulationWaveform;
