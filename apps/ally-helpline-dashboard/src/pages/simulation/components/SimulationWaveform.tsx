import { FC, useMemo } from "react";

import { useLocalParticipant } from "@livekit/components-react";
import { Track } from "livekit-client";

import { audioLevelConfig } from "@constants";
import { useAudioLevel } from "@hooks";

import { circleList, circleStyles } from "./constants";
import { AudioTrackRef, CircleProps } from "./types";

const Circle: FC<CircleProps> = ({ circleNumber, config, audioLevel }) => {
  const { scale, isStatic } = config;
  const { BASE_SIZE, BORDER, GRADIENT, MIN_SCALE, TRANSITION_MS } = circleStyles;

  const isActive = audioLevel > audioLevelConfig.threshold;
  const circleScale = scale * (isStatic ? 1 : MIN_SCALE + (audioLevel * circleNumber) / 3);
  const intensity = 1 / scale;

  const styles = useMemo(
    () => ({
      width: `${BASE_SIZE}px`,
      height: `${BASE_SIZE}px`,
      background: `linear-gradient(${GRADIENT.ANGLE}deg, 
            rgba(${GRADIENT.START_COLOR}, ${intensity}) 0%, 
            rgba(${GRADIENT.END_COLOR}, ${intensity}) 100%)`,
      transform: `scale(${circleScale})`,
      transitionDuration: `${TRANSITION_MS}ms`,
      border: `${isStatic && isActive ? BORDER.WIDTH : 0}px solid ${BORDER.COLOR}`,
      opacity: isStatic ? 1 : isActive ? 1 : 0,
    }),
    [isStatic, isActive, intensity, circleScale],
  );

  return <div className="absolute rounded-full transition-all" style={styles} />;
};

const CircleWaveVisualizer = ({ trackRef }: { trackRef: AudioTrackRef }) => {
  const audioLevel = useAudioLevel(trackRef.publication?.track?.mediaStreamTrack);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {circleList.map((config, index) => (
        <Circle key={index} circleNumber={index} config={config} audioLevel={audioLevel} />
      ))}
    </div>
  );
};

const SimulationWaveform: FC = () => {
  const { localParticipant } = useLocalParticipant();
  const audioPublication = localParticipant
    ?.getTrackPublications()
    .find(pub => pub.kind === Track.Kind.Audio);

  return (
    <div className="flex justify-center items-center w-[90%] sm:w-[60%] lg:w-[60%] xl:w-[50%] 2xl:w-[40%] h-[70vh]">
      <CircleWaveVisualizer
        trackRef={{
          participant: localParticipant,
          source: Track.Source.Microphone,
          publication: audioPublication,
        }}
      />
    </div>
  );
};

export default SimulationWaveform;
