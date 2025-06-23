import {
  FC,
  useEffect,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { useGetNudgeStatusQuery } from "@/api/audioCall";
import { RootState } from "@/store/store";
import { useSocket, useWebRTC } from "@/hooks";
import { UserRole } from "@/types/user";
import { FeedbackResponse, MessageType, SocketEvent } from "@/types/message";
import { SocketConnectionTypes } from "@/constants/socket";

import { reduceTranscriptions } from "./utils";
import { CallTranscriptProps, Transcription, Nudge } from "./types";
import { AUDIO_FILE_SIZE, OFFER_TIMEOUT_MS } from "./constants";
import AudioCallBackgroundWrapper from "./components/AudioCallBackgroundWrapper";
import CallSidebar from "./components/CallSidebar";
import RealTimeTranscript from "./components/RealTimeTranscript";
import CallControls from "./components/CallControls";
import CallInterface from "./components/CallInterface";

import "./CallTranscript.css";

// TODO: Uninstall react-audio-voice-recorder
// TODO: Split transcription to client-counselor
// TODO: Try to make it more similar to Figma
// TODO: Responsiveness
// TODO: Blurry effect at the top and bottom of the conversation
// TODO: Add streaming effect in transcription
// TODO: Find firefox issue
// TODO: Bug with no trascript intermittently
// TODO: start Audio chat not send sometimes

const CallTranscript: FC<CallTranscriptProps> = ({
  endSession,
  activeChat,
}) => {
  const navigate = useNavigate();

  const user = useSelector((state: RootState) => state.user.user);
  const chatId = useMemo(() => activeChat.chatId, [activeChat]);

  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [speakerTranscriptions, setSpeakerTranscriptions] = useState<
    Transcription[]
  >([]);
  const [myTranscriptions, setMyTranscriptions] = useState<Transcription[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [stage, setStage] = useState<string>();
  const [isUserJoined, setIsUserJoined] = useState(null);
  const { data: nudgeStatus } = useGetNudgeStatusQuery();

  const isClient = user?.role === UserRole.CLIENT;
  const isCounsellor = user?.role === UserRole.COUNSELOR;

  const updateLastTranscription = (
    setCorrespondingTranscription: Dispatch<SetStateAction<Transcription[]>>
  ) => {
    setCorrespondingTranscription((prev) => {
      const updatedList = [...prev];
      if (prev.length > 0) {
        updatedList[prev.length - 1] = {
          ...prev[prev.length - 1],
          isFinal: true,
          isSentenceComplete: true,
        };
      }
      return updatedList;
    });
  };

  const processTranscription = (
    setCorrespondingTranscription: Dispatch<SetStateAction<Transcription[]>>,
    payload
  ) => {
    setCorrespondingTranscription((prev) => {
      const lastTranscription = prev[prev.length - 1];
      if (!lastTranscription) {
        return [
          ...prev,
          {
            id: payload.id,
            message: payload.content,
            senderId: payload.senderId,
            timestamp: payload.createdAt,
            isFinal: payload.isFinal,
            isSentenceComplete: payload.isSentenceComplete,
          },
        ];
      }
      if (!lastTranscription.isFinal) {
        // replace the last transcription with the new one
        const updatedTranscriptions = [...prev];
        updatedTranscriptions[prev.length - 1] = {
          ...lastTranscription,
          message: payload.content,
          isSentenceComplete: payload.isSentenceComplete,
          isFinal: payload.isFinal,
        };
        return updatedTranscriptions;
      }

      if (
        !lastTranscription.isSentenceComplete &&
        lastTranscription.isFinal &&
        payload.isFinal
      ) {
        // concat the last transcription with the new one
        const updatedTranscriptions = [...prev];
        updatedTranscriptions[prev.length - 1] = {
          ...lastTranscription,
          message: `${lastTranscription.message} ${payload.content}`,
          isSentenceComplete: payload.isSentenceComplete,
          isFinal: payload.isFinal,
        };
        return updatedTranscriptions;
      }
      return [
        ...prev,
        {
          id: payload.id,
          message: payload.content,
          senderId: payload.senderId,
          timestamp: payload.createdAt,
          isFinal: payload.isFinal,
          isSentenceComplete: payload.isSentenceComplete,
        },
      ];
    });
  };

  const socketEventCallbacks = useMemo(
    () => ({
      [SocketEvent.STAGE]: (data) => {
        setStage(data?.payload?.content);
      },
      [SocketEvent.CHAT_ENDED]: () => {
        disconnect();
        if (isClient) {
          navigate("/");
          return;
        }
        confirmEndSession(false);
      },
      [SocketEvent.NUDGE]: (data) => {
        const nudge = data.payload;
        if (nudge.type === MessageType.NUDGE) {
          setNudges((prev) => [
            ...prev,
            {
              content: nudge.content as string,
              id: nudge.id as number,
              feedback: nudge.feedback as FeedbackResponse,
            },
          ]);
        }
      },
      [SocketEvent.MESSAGE_RECEIVED]: (data) => {
        const message = data.payload;
        if (message.type === MessageType.TEXT) {
          if (message.senderId === user?.userId) {
            processTranscription(setMyTranscriptions, message);
          } else {
            processTranscription(setSpeakerTranscriptions, message);
          }
        }
      },
      [SocketEvent.UTTERANCE_ENDED]: (data) => {
        if (data?.payload.senderId === user?.userId) {
          updateLastTranscription(setMyTranscriptions);
        } else {
          updateLastTranscription(setSpeakerTranscriptions);
        }
      },
      [SocketEvent.USER_JOINED]: () => {
        setIsUserJoined(true);
      },
      [SocketEvent.USER_DISCONNECTED]: () => {
        setIsUserJoined(false);
      },
    }),
    []
  );

  const {
    connect,
    disconnect,
    emitSocketEvent,
    setListenerForEvent,
    removeIfListenerPresent,
  } = useSocket({
    userId: user.userId,
    eventCallbacks: socketEventCallbacks,
    connectionType: SocketConnectionTypes.WEBRTC_AUDIO_CALL,
  });

  const {
    localStreamRef,
    remoteStreamRef,
    offerTimeoutRef,
    iceServers,
    peerConnection,
    mediaRecorder,
    remoteMediaRecorder,
    fetchIceServers,
    setupWebRTCAndMediaRecorder,
    handleOnIceCandidate,
    handleWebRTCOffer,
    handleWebRTCAnswer,
  } = useWebRTC({
    emitSocketEvent,
    chatId,
    isClient,
    audioFileSize: AUDIO_FILE_SIZE,
    offerTimeoutMs: OFFER_TIMEOUT_MS,
  });

  useEffect(() => {
    if (activeChat.messages && activeChat.messages.length > 0) {
      const existingTranscriptions = [...activeChat.messages]
        .reverse()
        .filter((transcription) => transcription.type === MessageType.TEXT)
        .map((transcription) => ({
          id: transcription.id,
          message: transcription.content,
          senderId: transcription.senderId,
          timestamp: transcription.createdAt,
          isFinal: true,
          isSentenceComplete: true,
        }));
      setMyTranscriptions(
        existingTranscriptions?.filter(
          (payload) => payload.senderId === user.userId
        )
      );
      setSpeakerTranscriptions(
        existingTranscriptions?.filter(
          (payload) => payload.senderId !== user.userId
        )
      );

      const existingNudges = [...activeChat.messages]
        .reverse()
        .filter((message) => message.type === MessageType.NUDGE)
        .map((nudge) => ({
          content: nudge.content,
          id: nudge.id,
          feedback: nudge.feedback,
        }));
      setNudges(existingNudges);
    }
  }, [activeChat]);

  useEffect(() => {
    if (isMuted) {
      emitSocketEvent(SocketEvent.AUDIO_CHAT_MUTED, {
        chatId,
      });
    }
  }, [isMuted]);

  useEffect(() => {
    // fetch only for audio call page
    fetchIceServers();
  }, []);

  useEffect(() => {
    // only for audio call page
    if (chatId && user && iceServers) {
      //connect socket
      connect(chatId);
      setupWebRTCAndMediaRecorder();
    }

    return () => {
      // Cleanup
      if (offerTimeoutRef.current) {
        clearTimeout(offerTimeoutRef.current);
      }
      if (peerConnection) {
        peerConnection.close();
      }
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      if (remoteMediaRecorder && remoteMediaRecorder.state !== "inactive") {
        remoteMediaRecorder.stop();
      }
      disconnect();
    };
  }, [chatId, user, isCounsellor, isClient, iceServers]);

  useEffect(() => {
    if (!mediaRecorder) return;
    if (isMuted) {
      mediaRecorder?.pause();
      // Mute all audio tracks in the local stream
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    } else {
      mediaRecorder?.resume();
      // Unmute all audio tracks in the local stream
      localStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }
  }, [isMuted, mediaRecorder]);

  useEffect(() => {
    if (chatId) {
      removeIfListenerPresent(SocketEvent.WEBRTC_OFFER);
      removeIfListenerPresent(SocketEvent.WEBRTC_ANSWER);
      removeIfListenerPresent(SocketEvent.ICE_CANDIDATE);
      setListenerForEvent(SocketEvent.WEBRTC_OFFER, handleWebRTCOffer);
      setListenerForEvent(SocketEvent.WEBRTC_ANSWER, handleWebRTCAnswer);
      setListenerForEvent(SocketEvent.ICE_CANDIDATE, handleOnIceCandidate);
    }
  }, [handleWebRTCOffer, chatId, handleWebRTCAnswer, handleOnIceCandidate]);

  const confirmEndSession = async (triggerApi: boolean = true) => {
    try {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      // Stop all tracks in the local stream to release the microphone
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      endSession(triggerApi);
      disconnect();
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  const transcriptions = useMemo(() => {
    const reducedMyTranscriptions = reduceTranscriptions(myTranscriptions);
    const reducedSpeakerTranscriptions = reduceTranscriptions(
      speakerTranscriptions
    );

    return [...reducedMyTranscriptions, ...reducedSpeakerTranscriptions].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [myTranscriptions, speakerTranscriptions]);

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <AudioCallBackgroundWrapper>
        <CallInterface
          activeChat={activeChat}
          isCounsellor={isCounsellor}
          isUserJoined={isUserJoined}
          mediaRecorder={mediaRecorder}
          remoteMediaRecorder={remoteMediaRecorder}
          remoteStreamRef={remoteStreamRef}
        />

        {/* Update transcription container with max-height */}
        {isCounsellor && isUserJoined && (
          <RealTimeTranscript
            isFocusMode={isFocusMode}
            transcriptions={transcriptions}
          />
        )}

        <CallControls
          isCounsellor={isCounsellor}
          isFocusMode={isFocusMode}
          isMuted={isMuted}
          isUserJoined={isUserJoined}
          onCutCallButtonClick={() => confirmEndSession(true)}
          onFocusButtonClick={(isFocused: boolean) => setIsFocusMode(isFocused)}
          onMuteButtonClick={() => setIsMuted((prev) => !prev)}
        />
      </AudioCallBackgroundWrapper>
      {nudgeStatus && (
        <CallSidebar
          isCounsellor={isCounsellor}
          isFocusMode={isFocusMode}
          isUserJoined={isUserJoined}
          nudges={nudges}
          onClose={() => setIsFocusMode(false)}
          stage={stage}
        />
      )}
    </div>
  );
};

export default CallTranscript;
