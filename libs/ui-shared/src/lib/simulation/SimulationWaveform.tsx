import { FC, useMemo } from "react";

import { useRemoteParticipants } from "@livekit/components-react";
import { Track } from "livekit-client";

import { CircleConfig } from "./types";
import { useAudioLevel } from "./useAudioLevel";
import { audioLevelConfig, circleList, circleStyles } from "./waveformConstants";

interface CircleProps {
  circleNumber: number;
  config: CircleConfig;
  audioLevel: number;
}

interface AudioTrackRef {
  participant: any;
  source: string;
  publication?: any;
}

const Circle: FC<CircleProps> = ({ circleNumber, config, audioLevel }) => {
  const { scale, isStatic } = config;
  const { BASE_SIZE, BORDER, MIN_SCALE, TRANSITION_MS, BACKGROUND_COLOR } = circleStyles;

  const isActive = audioLevel > audioLevelConfig.threshold;
  const circleScale = scale * (MIN_SCALE + (audioLevel * circleNumber) / 3);

  const styles = useMemo(
    () => ({
      width: `${BASE_SIZE}px`,
      height: `${BASE_SIZE}px`,
      transform: `scale(${circleScale})`,
      background: BACKGROUND_COLOR,
      transitionDuration: `${TRANSITION_MS}ms`,
      border: `${isStatic && isActive ? BORDER.WIDTH : 0}px solid ${BORDER.COLOR}`,
      opacity: isActive ? (scale === 3 ? 0.3 : 0.1) : 0,
    }),
    [isStatic, isActive, circleScale],
  );

  return <div className="absolute rounded-full transition-all" style={styles} />;
};

const CircleWaveVisualizer = ({
  trackRef,
  roomData,
}: {
  trackRef: AudioTrackRef;
  roomData: any;
}) => {
  const audioLevel = useAudioLevel(trackRef.publication?.track?.mediaStreamTrack);

  const imageUrl = roomData ? roomData?.coverImageUrl : null;

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
        <Circle key={index} circleNumber={index + 1} config={config} audioLevel={audioLevel} />
      ))}
    </div>
  );
};

export const SimulationWaveform = ({ roomData }: { roomData: any }) => {
  const remoteParticipants = useRemoteParticipants();
  const remoteParticipant = remoteParticipants.length > 0 ? remoteParticipants[0] : null;
  const audioPublication = remoteParticipant
    ?.getTrackPublications()
    .find((pub: any) => pub.kind === Track.Kind.Audio);

  return (
    <div className="flex justify-center items-center w-[90%] sm:w-[60%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%] h-[70vh]">
      <CircleWaveVisualizer
        trackRef={{
          participant: remoteParticipant,
          source: Track.Source.Microphone,
          publication: audioPublication,
        }}
        roomData={roomData}
      />
    </div>
  );
};
