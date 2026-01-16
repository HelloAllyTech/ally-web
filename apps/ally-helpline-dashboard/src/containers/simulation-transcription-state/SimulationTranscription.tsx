import { FC, useEffect, useState } from "react";

import { motion } from "framer-motion";
import { useSelector } from "react-redux";

import { Toggle } from "@ally-ui-mono/ui-shared/index";
import { useGetSimulationTranscriptQuery } from "@src/api";
import { Button } from "@src/components";
import Transcription from "@src/components/transcription";
import { RootState } from "@src/store";
import { SimulationTranscriptMessage } from "@src/types";

import { PRIVACY_OPTIONS } from "./constant";
import { SimulationTranscriptionProps } from "./types";

export const SimulationTranscription: FC<SimulationTranscriptionProps> = ({
  className,
  hideSection,
  sessionId,
}) => {
  const { user } = useSelector((state: RootState) => state.user);
  const [transcriptOffset, setTranscriptOffset] = useState(0);
  const [transcriptList, setTranscriptList] = useState<SimulationTranscriptMessage[]>([]);
  const { data: simulationTranscript } = useGetSimulationTranscriptQuery({
    sessionId,
    offset: transcriptOffset,
    limit: 30,
    sortBy: "createdAt",
  });
  useEffect(() => {
    setTranscriptOffset(0);
    setTranscriptList([]);
  }, [sessionId]);
  useEffect(() => {
    if (simulationTranscript?.messages?.length > 0) {
      setTranscriptList(prev => [...prev, ...simulationTranscript.messages]);
    }
  }, [simulationTranscript]);

  if (hideSection) return null;

  return (
    <div className={`${className} h-full`}>
      <Transcription transcriptList={transcriptList} userId={user?.id} />

      <div className="flex justify-center mt-6">
        <Toggle items={PRIVACY_OPTIONS} onChange={() => {}} />
      </div>
      {
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="absolute bottom-16 left-4 right-4 z-10 w-fit mx-auto max-w-full bg-white"
        >
          <Button onClick={() => {}} className="w-fit mx-auto">
            Try another Simulation
          </Button>
        </motion.div>
      }
    </div>
  );
};
