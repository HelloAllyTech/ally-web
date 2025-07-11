import { FC, useEffect, useMemo, useState, Dispatch, SetStateAction, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { useGetNudgeStatusQuery } from "@/api/audioCall";
import { RootState } from "@/store/store";
import { useSocket, useWebRTCCallSetup } from "@/hooks";
import { UserRole } from "@/types/user";
import {
  ChatStatus,
  FeedbackResponse,
  MessageType,
  SocketEvent,
  Transcription,
} from "@/types/message";
import { SocketConnectionTypes } from "@/constants/socket";
import { logger } from "@ally-ui-mono/ui-shared";

import { reduceTranscriptions } from "../utils";
import { CallTranscriptProps, Nudge } from "../types";
import { AUDIO_FILE_SIZE, OFFER_TIMEOUT_MS } from "../constants";
import {
  AudioCallBackgroundWrapper,
  CallSidebar,
  RealTimeTranscript,
  CallControls,
  CallInterface,
} from ".";

import "./CallTranscript.css";

// TODO: Uninstall react-audio-voice-recorder
// TODO: Split transcription to client-counselor
// TODO: Try to make it more similar to Figma
// TODO: Responsiveness
// TODO: Blurry effect at the top and bottom of the conversation
// TODO: Find firefox issue
// TODO: Bug with no trascript intermittently
// TODO: start Audio chat not send sometimes

const CallTranscript: FC<CallTranscriptProps> = ({
  endSession,
  activeChat,
  microphoneChatId,
  isMicrophoneMode,
  setMicrophoneChatId,
}) => {
  const navigate = useNavigate();

  const user = useSelector((state: RootState) => state.user.user);
  const activeChatId = useMemo(() => activeChat?.chatId, [activeChat]);
  const microphoneStreamRef = useRef<MediaStream | null>(null);

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [speakerTranscriptions, setSpeakerTranscriptions] = useState<Transcription[]>([]);
  const [myTranscriptions, setMyTranscriptions] = useState<Transcription[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [stage, setStage] = useState<string>();
  const [isUserJoined, setIsUserJoined] = useState(null);
  const { data: nudgeStatus } = useGetNudgeStatusQuery();

  const isClient = user?.role === UserRole.CLIENT;
  const isCounsellor = user?.role === UserRole.COUNSELOR;
  // const isWebRTC = activeChat.provider === "WEBRTC"; // to distinguish between exotel and webrtc

  const updateLastTranscription = (
    setCorrespondingTranscription: Dispatch<SetStateAction<Transcription[]>>,
  ) => {
    setCorrespondingTranscription(prev => {
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
    payload,
  ) => {
    setCorrespondingTranscription(prev => {
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

      if (!lastTranscription.isSentenceComplete && lastTranscription.isFinal && payload.isFinal) {
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
      [SocketEvent.STAGE]: data => {
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
      [SocketEvent.NUDGE]: data => {
        const nudge = data.payload;
        if (nudge.type === MessageType.NUDGE) {
          setNudges(prev => [
            ...prev,
            {
              content: nudge.content as string,
              id: nudge.id as number,
              feedback: nudge.feedback as FeedbackResponse,
            },
          ]);
        }
      },
      [SocketEvent.MESSAGE_RECEIVED]: data => {
        const message = data.payload;
        if (message.type === MessageType.TEXT) {
          if (message.senderId === user?.userId) {
            processTranscription(setMyTranscriptions, message);
          } else {
            processTranscription(setSpeakerTranscriptions, message);
          }
        }
      },
      [SocketEvent.UTTERANCE_ENDED]: data => {
        if (data?.payload.senderId === user?.userId) {
          updateLastTranscription(setMyTranscriptions);
        } else {
          updateLastTranscription(setSpeakerTranscriptions);
        }
      },
      [SocketEvent.USER_JOINED]: data => {
        if (isMicrophoneMode) {
          setMicrophoneChatId(data.payload.chatId);
        }
        setIsUserJoined(true);
      },
      [SocketEvent.USER_DISCONNECTED]: () => {
        setIsUserJoined(false);
      },
    }),
    [],
  );

  const { connect, disconnect, emitSocketEvent, setListenerForEvent, removeIfListenerPresent } =
    useSocket({
      eventCallbacks: socketEventCallbacks,
      connectionType: isMicrophoneMode
        ? SocketConnectionTypes.MICROPHONE_MODE
        : SocketConnectionTypes.WEBRTC_AUDIO_CALL,
    });

  const {
    localStreamRef,
    remoteStreamRef,
    offerTimeoutRef,
    iceServers,
    peerConnection,
    remoteMediaRecorder,
    fetchIceServers,
    setupWebRTC,
    handleOnIceCandidate,
    handleWebRTCOffer,
    handleWebRTCAnswer,
  } = useWebRTCCallSetup({
    emitSocketEvent,
    chatId: activeChatId,
    isClient,
    offerTimeoutMs: OFFER_TIMEOUT_MS,
  });

  const setupMediaRecorder = (stream: MediaStream) => {
    // Setup media recorder
    const chunks: BlobPart[] = [];
    let totalSize = 0;
    // Create a MediaRecorder to capture audio data
    const recorder = new MediaRecorder(stream);

    const sendBufferedAudio = () => {
      if (chunks.length === 0) return;
      const audioBlob = new Blob(chunks, { type: "audio/webm" });
      chunks.length = 0;
      totalSize = 0;

      const fileReader = new FileReader();
      fileReader.readAsDataURL(audioBlob);
      fileReader.onloadend = () => {
        const base64AudioData = fileReader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/webm;base64,") to get just the base64 string
        const base64String = base64AudioData.split(",")[1];
        emitSocketEvent(SocketEvent.AUDIO_MESSAGE, {
          audioData: base64String,
          chatId: activeChatId ?? microphoneChatId,
        });
      };
    };

    recorder.ondataavailable = event => {
      if (event.data.size > 0) {
        chunks.push(event.data);
        totalSize += event.data.size;

        if (totalSize >= AUDIO_FILE_SIZE) {
          sendBufferedAudio();
        }
      }
    };

    recorder.onstop = () => {
      if (totalSize < AUDIO_FILE_SIZE && totalSize > 0) {
        sendBufferedAudio();
      }
    };

    recorder.start(500);
    setMediaRecorder(recorder);
  };

  useEffect(() => {
    if (activeChat?.messages && activeChat.messages.length > 0) {
      setMicrophoneChatId(activeChat.chatId);
      const existingTranscriptions = [...activeChat.messages]
        .reverse()
        .filter(transcription => transcription.type === MessageType.TEXT)
        .map(transcription => ({
          id: transcription.id,
          message: transcription.content,
          senderId: transcription.senderId,
          timestamp: transcription.createdAt,
          isFinal: true,
          isSentenceComplete: true,
        }));
      setMyTranscriptions(
        existingTranscriptions?.filter(payload => payload.senderId === user.userId),
      );
      setSpeakerTranscriptions(
        existingTranscriptions?.filter(payload => payload.senderId !== user.userId),
      );

      const existingNudges = [...activeChat.messages]
        .reverse()
        .filter(message => message.type === MessageType.NUDGE)
        .map(nudge => ({
          content: nudge.content,
          id: nudge.id,
          feedback: nudge.feedback,
        }));
      setNudges(existingNudges);
    }
    if (
      isMicrophoneMode &&
      activeChat?.status === ChatStatus.ACTIVE &&
      activeChat?.provider === "MICROPHONE"
    ) {
      setMicrophoneChatId(activeChat.chatId);
      // To notify that call has started
      setIsUserJoined(true);
    }
  }, [activeChat]);

  useEffect(() => {
    if (isMuted) {
      emitSocketEvent(SocketEvent.AUDIO_CHAT_MUTED, {
        chatId: activeChatId ?? microphoneChatId,
      });
    }
  }, [isMuted]);

  useEffect(() => {
    if (!isMicrophoneMode) {
      fetchIceServers();
    }
  }, []);

  useEffect(() => {
    if (user && !isMicrophoneMode && iceServers && activeChatId) {
      connect(activeChatId);
      setupWebRTC();
    }

    return () => {
      if (!isMicrophoneMode) {
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
      }
    };
  }, [activeChatId, user, isCounsellor, isClient, iceServers, isMicrophoneMode]);

  useEffect(() => {
    if (user && isMicrophoneMode) {
      connect();
      // Delaying the start of audio chat to ensure the connection is established and session is created
      // TODO: Remove this delay in future once session_created event is generated on the server side
      setTimeout(() => {
        emitSocketEvent(SocketEvent.START_AUDIO_CHAT, { platform: "WEB" });
      }, 2000);
    }

    return () => {
      if (isMicrophoneMode) {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
        disconnect();
      }
    };
  }, [isMicrophoneMode]);

  useEffect(() => {
    if (isMicrophoneMode) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        microphoneStreamRef.current = stream;
      });
    }
  }, [isMicrophoneMode]);

  useEffect(() => {
    if (isMicrophoneMode) {
      if (microphoneStreamRef.current) {
        setupMediaRecorder(microphoneStreamRef.current);
      }
    } else {
      if (localStreamRef.current) {
        setupMediaRecorder(localStreamRef.current);
      }
    }
  }, [localStreamRef.current, microphoneStreamRef.current]);

  useEffect(() => {
    if (!mediaRecorder) return;
    if (isMuted) {
      mediaRecorder?.pause();
      // Mute all audio tracks in the local stream
      localStreamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      microphoneStreamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    } else {
      mediaRecorder?.resume();
      // Unmute all audio tracks in the local stream
      localStreamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      microphoneStreamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
  }, [isMuted, mediaRecorder]);

  useEffect(() => {
    if (activeChatId) {
      removeIfListenerPresent(SocketEvent.WEBRTC_OFFER);
      removeIfListenerPresent(SocketEvent.WEBRTC_ANSWER);
      removeIfListenerPresent(SocketEvent.ICE_CANDIDATE);
      setListenerForEvent(SocketEvent.WEBRTC_OFFER, handleWebRTCOffer);
      setListenerForEvent(SocketEvent.WEBRTC_ANSWER, handleWebRTCAnswer);
      setListenerForEvent(SocketEvent.ICE_CANDIDATE, handleOnIceCandidate);
    }
  }, [handleWebRTCOffer, activeChatId, handleWebRTCAnswer, handleOnIceCandidate]);

  const confirmEndSession = async (triggerApi: boolean = true) => {
    try {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      // Stop all tracks in the local stream to release the microphone
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
        microphoneStreamRef.current = null;
      }
      endSession(triggerApi, activeChatId ?? microphoneChatId);
      disconnect();
    } catch (error) {
      logger.info(`Error ending session:, ${error}`);
    }
  };

  const transcriptions = useMemo(() => {
    const reducedMyTranscriptions = reduceTranscriptions(myTranscriptions);
    const reducedSpeakerTranscriptions = reduceTranscriptions(speakerTranscriptions);

    return [...reducedMyTranscriptions, ...reducedSpeakerTranscriptions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
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
          isMicrophoneMode={isMicrophoneMode}
        />

        {/* Update transcription container with max-height */}
        {isCounsellor && isUserJoined && (
          <RealTimeTranscript isFocusMode={isFocusMode} transcriptions={transcriptions} />
        )}

        <CallControls
          isFocusMode={isFocusMode}
          isMuted={isMuted}
          isPrimaryButtonDisabled={isMicrophoneMode && !microphoneChatId}
          isSecondaryButtonDisabled={!isUserJoined}
          showFocusButton={isCounsellor}
          onCutCallButtonClick={() => confirmEndSession(true)}
          onFocusButtonClick={(isFocused: boolean) => setIsFocusMode(isFocused)}
          onMuteButtonClick={() => setIsMuted(prev => !prev)}
        />
      </AudioCallBackgroundWrapper>
      {nudgeStatus && (
        <CallSidebar
          showSidebar={isCounsellor && isUserJoined}
          isFocusMode={isFocusMode}
          nudges={nudges}
          onClose={() => setIsFocusMode(false)}
          stage={stage}
        />
      )}
    </div>
  );
};

export default CallTranscript;
