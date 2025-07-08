import { Transcription } from "@/types/message";

export const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60) % 60;
  const seconds = time % 60;
  const hours = Math.floor(time / 3600);
  return `
  ${hours > 0 ? `${hours.toString().padStart(2, "0")} :` : "00 :"}
  ${minutes.toString().padStart(2, "0")} :
  ${seconds.toString().padStart(2, "0")}
  `;
};

export const getSpeakerName = (senderId: number, previousSenderId: number, userId: number) => {
  if (previousSenderId && previousSenderId == senderId) return "";
  return senderId === userId ? "You" : "Speaker";
};

export const reduceTranscriptions = (transcriptions: Transcription[]): Transcription[] => {
  return transcriptions.reduce((acc: Transcription[], current: Transcription) => {
    if (acc.length === 0) {
      return [current];
    }

    const last = acc[acc.length - 1];

    // If the last transcription is not sentence complete, combine last with current
    if (!last.isSentenceComplete) {
      acc[acc.length - 1] = {
        ...last,
        message: `${last.message} ${current.message}`,
        isSentenceComplete: current.isSentenceComplete,
        timestamp: current.timestamp, // Update timestamp to latest
      };
      return acc;
    }

    // Otherwise add as new entry
    return [...acc, current];
  }, []);
};
