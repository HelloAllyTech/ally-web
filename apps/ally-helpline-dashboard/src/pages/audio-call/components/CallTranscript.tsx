import { FC, useEffect, useMemo, useState, Dispatch, SetStateAction, useRef } from "react";

import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useGetNudgeStatusQuery } from "@api";
import { EndSessionIllustration } from "@assets";
import { ButtonVariant, ConfirmationDialog } from "@components";
import {
  SocketConnectionTypes,
  CallProvider,
  SocketDisconnectionReasons,
  MediaRecorderState,
} from "@constants";
import { useSocket } from "@hooks";
import { RootState } from "@store";
import {
  ChatStatus,
  FeedbackResponse,
  MessageType,
  SocketEvent,
  Transcription,
  UserRole,
} from "@types";
import { isProviderCloudTelephony } from "@utils";

import { CallSidebar, RealTimeTranscript, CallControls, CallInterface } from ".";
import { AUDIO_FILE_SIZE } from "../constants";
import { CallTranscriptProps, Nudge } from "../types";
import { reduceTranscriptions } from "../utils";
import { NetworkIssuesList } from "./constants";

import "./CallTranscript.css";

const CallTranscript: FC<CallTranscriptProps> = ({
  endSession,
  activeChat,
  microphoneChatId,
  isMicrophoneMode,
  isExotelMode,
  setMicrophoneChatId,
}) => {
  const navigate = useNavigate();

  const user = useSelector((state: RootState) => state.user.user);
  const activeChatId = useMemo(() => activeChat?.chatId, [activeChat]);
  const microphoneStreamRef = useRef<MediaStream | null>(null);

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [speakerTranscriptions, setSpeakerTranscriptions] = useState<Transcription[]>([]);
  const [myTranscriptions, setMyTranscriptions] = useState<Transcription[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [stage, setStage] = useState<string>();
  const [isUserJoined, setIsUserJoined] = useState<boolean>(false);
  const [socketDisconnectionReason, setSocketDisconnectionReason] =
    useState<SocketDisconnectionReasons>();
  const [isSessionCreated, setIsSessionCreated] = useState<boolean>(false);
  const [isStartAudioChatEmitted, setIsStartAudioChatEmitted] = useState<boolean>(false);
  const [isEndCallDialogOpen, setIsEndCallDialogOpen] = useState<boolean>(false);

  const { data: nudgeStatus } = useGetNudgeStatusQuery();

  const isCounsellor = user?.role === UserRole.COUNSELLOR;
  const isSharedMicrophoneMode =
    isMicrophoneMode &&
    activeChat?.chatId &&
    activeChat?.platform === "WEB" &&
    activeChat?.provider === CallProvider.MICROPHONE;
  const isNonWebChat = activeChat?.platform && activeChat?.platform !== "WEB";
  const isSocketDisconnected = !!socketDisconnectionReason;

  const isEndSessionDisabled = isMicrophoneMode && (!microphoneChatId || isSocketDisconnected);
  const isFocusButtonDisabled = !isUserJoined || isSocketDisconnected;
  const isPauseTranscriptionDisabled =
    !isUserJoined || isNonWebChat || isSharedMicrophoneMode || isExotelMode || isSocketDisconnected;

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

  const socketEventCallbacks = {
    [SocketEvent.SESSION_CREATED]: () => {
      setIsSessionCreated(true);
    },
    [SocketEvent.STAGE]: data => {
      setStage(data?.payload?.content);
    },
    [SocketEvent.CHAT_ENDED]: data => {
      cleanupMediaRecorder();
      disconnect();
      // trigegrApi is false as this event will be received only upon ending the call
      endSession(false, data?.payload?.chatId);
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
      // User disconnected event might happen if mobile is open and gets closed as mobile have a live socket conenction on login for microphone-mode
      if (!isMicrophoneMode && !isExotelMode) {
        setIsUserJoined(false);
      }
    },
    [SocketEvent.AUDIO_CHAT_ENDED]: () => {
      if (isMicrophoneMode) {
        disconnect();
        confirmEndSession(false);
      }
    },
    [SocketEvent.DISCONNECT]: (reason?: string) => {
      cleanupMediaRecorder();
      if (isMicrophoneMode) {
        // Check if it's a network-related disconnection
        const isNetworkIssue =
          reason && NetworkIssuesList.some(networkReason => reason.includes(networkReason));

        if (isNetworkIssue) {
          setSocketDisconnectionReason(
            isNonWebChat || isSharedMicrophoneMode
              ? SocketDisconnectionReasons.NO_NETWORK_IN_SHARED_SESSION
              : SocketDisconnectionReasons.NO_NETWORK,
          );
        } else {
          setSocketDisconnectionReason(SocketDisconnectionReasons.SOMETHING_WENT_WRONG);
        }
      }
    },
  };

  const cleanupMediaRecorder = () => {
    // Stop and cleanup media recorder
    if (mediaRecorder && mediaRecorder.state !== MediaRecorderState.INACTIVE) {
      mediaRecorder.stop();
    }

    // Stop all tracks in the microphone stream
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      microphoneStreamRef.current = null;
    }
  };

  const getConnectionType = () => {
    if (isMicrophoneMode) return SocketConnectionTypes.MICROPHONE_MODE;
    if (isExotelMode) return SocketConnectionTypes.CLOUD_TELEPHONY_CHAT;
    return SocketConnectionTypes.WEBRTC_AUDIO_CALL;
  };

  const { connect, disconnect, emitSocketEvent, setListenerForEvent, removeIfListenerPresent } =
    useSocket({
      eventCallbacks: socketEventCallbacks,
      connectionType: getConnectionType(),
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
      activeChat?.provider === CallProvider.MICROPHONE
    ) {
      setMicrophoneChatId(activeChat.chatId);
      // To notify that call has started
      setIsUserJoined(true);
    }
    if (
      isExotelMode &&
      activeChat?.status === ChatStatus.ACTIVE &&
      isProviderCloudTelephony(activeChat?.provider)
    ) {
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
    if (isExotelMode) {
      connect();
    }

    return () => {
      if (!isMicrophoneMode) {
        cleanupMediaRecorder();
      }
    };
  }, [activeChatId, isMicrophoneMode]);

  useEffect(() => {
    if (user && isMicrophoneMode) {
      connect();
    }

    return () => {
      if (isMicrophoneMode) {
        cleanupMediaRecorder();
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
      if (microphoneStreamRef.current && microphoneChatId) {
        setupMediaRecorder(microphoneStreamRef.current);
      }
    }
  }, [microphoneStreamRef.current, microphoneChatId]);

  useEffect(() => {
    if (!mediaRecorder) return;

    if (isMuted) {
      // Only pause if MediaRecorder is in recording state
      if (mediaRecorder.state === MediaRecorderState.RECORDING) {
        mediaRecorder.pause();
      }
      microphoneStreamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    } else {
      // Only resume if MediaRecorder is in paused state
      if (mediaRecorder.state === MediaRecorderState.PAUSED) {
        mediaRecorder.resume();
      }
      microphoneStreamRef.current?.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
  }, [isMuted, mediaRecorder]);

  const confirmEndSession = async (triggerApi: boolean = true) => {
    try {
      cleanupMediaRecorder();
      endSession(triggerApi, activeChatId ?? microphoneChatId);
    } catch (error) {
      logger.info(`Error ending session:, ${error}`);
    }
  };

  useEffect(() => {
    if (isMicrophoneMode && isSessionCreated && !isStartAudioChatEmitted) {
      if (microphoneChatId) {
        setIsStartAudioChatEmitted(true);
        toast.info(
          "You've joined an active call. To start a fresh conversation, simply end this call and begin a new one.",
        );
        return;
      }
      emitSocketEvent(SocketEvent.START_AUDIO_CHAT, {
        platform: "WEB",
        sampleRate: 48000,
      });
      setIsStartAudioChatEmitted(true);
    }
  }, [isMicrophoneMode, microphoneChatId, isSessionCreated, isStartAudioChatEmitted]);

  const transcriptions = useMemo(() => {
    const reducedMyTranscriptions = reduceTranscriptions(myTranscriptions);
    const reducedSpeakerTranscriptions = reduceTranscriptions(speakerTranscriptions);

    return [...reducedMyTranscriptions, ...reducedSpeakerTranscriptions].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [myTranscriptions, speakerTranscriptions]);

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <div className="w-screen h-screen bg-[#171A1A] flex flex-col gap-10 justify-center items-center overflow-hidden">
        <CallInterface
          activeChat={activeChat}
          isCounsellor={isCounsellor}
          isUserJoined={isUserJoined}
          socketDisconnectionReason={socketDisconnectionReason}
          mediaRecorder={mediaRecorder}
          isMicrophoneMode={isMicrophoneMode}
          isExotelMode={isExotelMode}
        />

        {/* Update transcription container with max-height */}
        {isCounsellor && isUserJoined && !isSocketDisconnected && (
          <RealTimeTranscript isFocusMode={isFocusMode} transcriptions={transcriptions} />
        )}

        <CallControls
          isFocusMode={isFocusMode}
          isPaused={isMuted}
          isEndSessionDisabled={isEndSessionDisabled}
          isFocusButtonDisabled={isFocusButtonDisabled}
          isPauseTranscriptionDisabled={isPauseTranscriptionDisabled}
          onEndSessionClick={() => setIsEndCallDialogOpen(true)}
          onFocusButtonClick={(isFocused: boolean) => setIsFocusMode(isFocused)}
          onPauseTranscriptionClick={() => setIsMuted(prev => !prev)}
          showEndSession={isMicrophoneMode}
          showFocusButton={isCounsellor}
          showPauseTranscription={isMicrophoneMode}
        />
      </div>
      <ConfirmationDialog
        title={{ normal: "End ", italic: "Session" }}
        isOpen={isEndCallDialogOpen}
        onClose={() => setIsEndCallDialogOpen(false)}
        content="Are you sure you want to end this Session"
        buttonVariant={ButtonVariant.DESTRUCTIVE}
        onButtonClick={() => confirmEndSession(true)}
        buttonText="End Session"
        icon={EndSessionIllustration}
      />
      {nudgeStatus && (!isMicrophoneMode || !socketDisconnectionReason) && (
        <CallSidebar
          showSidebar={isCounsellor && isUserJoined && !isSocketDisconnected}
          isFocusMode={isFocusMode}
          nudges={nudges}
          onClose={() => setIsFocusMode(true)}
          stage={stage}
        />
      )}
    </div>
  );
};

export default CallTranscript;
