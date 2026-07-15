import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";

import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logger } from "@ally-ui-mono/ui-shared";
import { useEndCallMutation, useLazyGetCounsellorChatQuery, useGetNudgeStatusQuery } from "@api";
import {
  SocketConnectionTypes,
  SocketDisconnectionReasons,
  MediaRecorderState,
  CallProvider,
  ROUTES,
  SESSION_STORAGE_KEYS,
  CallType,
  ScribeSessionMode,
} from "@constants";
import { useSocket } from "@hooks";
import { RootState } from "@store";
import {
  Chat,
  ChatStatus,
  FeedbackResponse,
  MessageType,
  SocketEvent,
  Transcription,
  QueueStatus,
} from "@types";

import { NetworkIssuesList, classifyDisconnect, RECONNECT_GRACE_MS } from "../components/constants";
import { AUDIO_FILE_SIZE } from "../constants";
import { Nudge } from "../types";

interface UseMicrophoneModeReturn {
  activeChat: Chat | null;
  microphoneChatId: number | null;
  mediaRecorder: MediaRecorder | null;
  isMuted: boolean;
  setIsMuted: Dispatch<SetStateAction<boolean>>;
  isFocusMode: boolean;
  setIsFocusMode: Dispatch<SetStateAction<boolean>>;
  speakerTranscriptions: Transcription[];
  myTranscriptions: Transcription[];
  nudges: Nudge[];
  stage: string | undefined;
  isUserJoined: boolean;
  socketDisconnectionReason: SocketDisconnectionReasons | undefined;
  isSessionCreated: boolean;
  isEndCallDialogOpen: boolean;
  setIsEndCallDialogOpen: Dispatch<SetStateAction<boolean>>;
  confirmEndSession: (triggerApi: boolean) => Promise<void>;
  isLoading: boolean;
  nudgeStatus: any;
  wakeLockRef: React.RefObject<WakeLockSentinel | null>;
  isActiveMicrophoneSession: boolean;
  connect: () => void;
  disconnect: () => void;
  isEndSessionDisabled: boolean;
  isFocusButtonDisabled: boolean;
  isPauseTranscriptionDisabled: boolean;
  isSocketDisconnected: boolean;
  availableChatTypes: CallType[];
}

export const useMicrophoneMode = (mode: string | null): UseMicrophoneModeReturn => {
  const navigate = useNavigate();
  const { availableChatTypes, user } = useSelector((state: RootState) => state.user);

  const [getCounsellorChat, { isLoading: isCounsellorChatLoading }] =
    useLazyGetCounsellorChatQuery();
  const [endCall, { isLoading: isEndCallLoading }] = useEndCallMutation();
  const { data: nudgeStatus } = useGetNudgeStatusQuery();

  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [microphoneChatId, setMicrophoneChatId] = useState<number | null>(null);
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

  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  // Fallback timer armed on a transient disconnect: if socket.io hasn't
  // reconnected within the window, we give up and surface an error. Cleared on
  // reconnect. Keeps a brief network blip from erroring the recording.
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeChatId = activeChat?.chatId;
  const userId = user?.userId;
  const isActiveMicrophoneSession = microphoneChatId && !activeChat?.chatId;
  const isLoading = isCounsellorChatLoading || isEndCallLoading;
  const isNonWebChat = activeChat?.platform && activeChat?.platform !== "WEB";
  const isSocketDisconnected = !!socketDisconnectionReason;
  const isEndSessionDisabled = !microphoneChatId || isSocketDisconnected;
  const isFocusButtonDisabled = !isUserJoined || isSocketDisconnected;
  const isSharedMicrophoneMode =
    activeChat?.chatId &&
    activeChat?.platform === "WEB" &&
    activeChat?.provider === CallProvider.MICROPHONE;
  const isPauseTranscriptionDisabled =
    !isUserJoined || isNonWebChat || isSharedMicrophoneMode || isSocketDisconnected;

  const endSessionAndNavigate = async (triggerApi: boolean = true, chatId: number) => {
    if (triggerApi) {
      const response = await endCall({ chatId });
      if (response?.data?.status !== QueueStatus.ENDED) {
        return;
      }
    }
    navigate(ROUTES.STRESS_BUSTER, {
      state: { chatId: chatId || activeChat?.chatId || microphoneChatId },
      replace: true,
    });
  };

  const updateLastTranscription = (
    setCorrespondingTranscription: Dispatch<SetStateAction<Transcription[]>>,
  ) => {
    setCorrespondingTranscription(previousTranscriptions => {
      const updatedList = [...previousTranscriptions];
      if (previousTranscriptions.length > 0) {
        updatedList[previousTranscriptions.length - 1] = {
          ...previousTranscriptions[previousTranscriptions.length - 1],
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
    setCorrespondingTranscription(previousTranscriptions => {
      const lastTranscription = previousTranscriptions[previousTranscriptions.length - 1];
      if (!lastTranscription) {
        return [
          ...previousTranscriptions,
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
        const updatedTranscriptions = [...previousTranscriptions];
        updatedTranscriptions[previousTranscriptions.length - 1] = {
          ...lastTranscription,
          message: payload.content,
          isSentenceComplete: payload.isSentenceComplete,
          isFinal: payload.isFinal,
        };
        return updatedTranscriptions;
      }

      if (!lastTranscription.isSentenceComplete && lastTranscription.isFinal && payload.isFinal) {
        // concat the last transcription with the new one
        const updatedTranscriptions = [...previousTranscriptions];
        updatedTranscriptions[previousTranscriptions.length - 1] = {
          ...lastTranscription,
          message: `${lastTranscription.message} ${payload.content}`,
          isSentenceComplete: payload.isSentenceComplete,
          isFinal: payload.isFinal,
        };
        return updatedTranscriptions;
      }
      return [
        ...previousTranscriptions,
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

  const cleanupMediaRecorder = () => {
    // Cancel any pending reconnect-grace timer so a torn-down session can't
    // fire a late error.
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

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

  const confirmEndSession = async (triggerApi: boolean = true) => {
    try {
      cleanupMediaRecorder();
      endSessionAndNavigate(triggerApi, activeChatId ?? microphoneChatId);
    } catch (error) {
      logger.info(`Error ending session:, ${error}`);
    }
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
      endSessionAndNavigate(false, data?.payload?.chatId);
    },
    [SocketEvent.NUDGE]: data => {
      const nudge = data.payload;
      if (nudge.type === MessageType.NUDGE) {
        setNudges(previousNudges => [
          ...previousNudges,
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
        if (message.senderId === userId) {
          processTranscription(setMyTranscriptions, message);
        } else {
          processTranscription(setSpeakerTranscriptions, message);
        }
      }
    },
    [SocketEvent.UTTERANCE_ENDED]: data => {
      if (data?.payload.senderId === userId) {
        updateLastTranscription(setMyTranscriptions);
      } else {
        updateLastTranscription(setSpeakerTranscriptions);
      }
    },
    [SocketEvent.USER_JOINED]: data => {
      setMicrophoneChatId(data.payload.chatId);
      setIsUserJoined(true);
    },
    [SocketEvent.AUDIO_CHAT_ENDED]: () => {
      disconnect();
      confirmEndSession(false);
    },
    [SocketEvent.CONNECT]: () => {
      // Reconnected after a transient drop: cancel the pending failure timer.
      // The recorder kept running and socket.io flushes the frames it buffered
      // while offline, so the recording simply resumes — no error, no data gap.
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    },
    [SocketEvent.DISCONNECT]: (reason?: string) => {
      const action = classifyDisconnect(reason);

      // We disconnected on purpose (normal end) — the end handlers already tore
      // down. Do nothing, and never show an error.
      if (action === "ignore") return;

      const showError = () => {
        cleanupMediaRecorder();
        const isNetworkIssue =
          reason && NetworkIssuesList.some(networkReason => reason.includes(networkReason));
        setSocketDisconnectionReason(
          isNetworkIssue
            ? isNonWebChat || isSharedMicrophoneMode
              ? SocketDisconnectionReasons.NO_NETWORK_IN_SHARED_SESSION
              : SocketDisconnectionReasons.NO_NETWORK
            : SocketDisconnectionReasons.SOMETHING_WENT_WRONG,
        );
      };

      // Non-recoverable (e.g. server-forced): fail now.
      if (action === "terminal") {
        showError();
        return;
      }

      // Transient drop socket.io will retry: KEEP the recorder running so its
      // frames buffer and flush on reconnect, and only error if reconnection
      // never comes back within the grace window. Don't stack timers if the
      // connection flaps.
      if (!reconnectTimerRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          showError();
        }, RECONNECT_GRACE_MS);
      }
    },
  };

  const { connect, disconnect, emitSocketEvent } = useSocket({
    eventCallbacks: socketEventCallbacks,
    connectionType: SocketConnectionTypes.MICROPHONE_MODE,
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

    // Previously missing: a MediaRecorder error (e.g. the OS revoking mic
    // access mid-recording) went unhandled, so capture silently stopped with no
    // signal. Surface it so the session doesn't just quietly die.
    recorder.onerror = () => {
      cleanupMediaRecorder();
      setSocketDisconnectionReason(SocketDisconnectionReasons.SOMETHING_WENT_WRONG);
    };

    recorder.start(500);
    setMediaRecorder(recorder);
  };

  // Process existing messages from activeChat
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
      setMyTranscriptions(existingTranscriptions?.filter(payload => payload.senderId === userId));
      setSpeakerTranscriptions(
        existingTranscriptions?.filter(payload => payload.senderId !== userId),
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
      activeChat?.status === ChatStatus.ACTIVE &&
      activeChat?.provider === CallProvider.MICROPHONE
    ) {
      setMicrophoneChatId(activeChat.chatId);
      // To notify that call has started
      setIsUserJoined(true);
    }
  }, [activeChat, userId, setMicrophoneChatId]);

  // Emit AUDIO_CHAT_MUTED event when muted
  useEffect(() => {
    if (isMuted) {
      emitSocketEvent(SocketEvent.AUDIO_CHAT_MUTED, {
        chatId: activeChatId ?? microphoneChatId,
      });
    }
  }, [isMuted, activeChatId, microphoneChatId, emitSocketEvent]);

  // Connect socket when user is available
  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      cleanupMediaRecorder();
    };
  }, [userId, connect]);

  // Get user media stream
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      microphoneStreamRef.current = stream;
    });
  }, []);

  // Setup media recorder when stream and chatId are available
  useEffect(() => {
    if (microphoneStreamRef.current && microphoneChatId) {
      setupMediaRecorder(microphoneStreamRef.current);
    }
  }, [microphoneStreamRef.current, microphoneChatId]);

  // Handle mute/unmute
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

  // Emit START_AUDIO_CHAT event when session is created
  useEffect(() => {
    if (isSessionCreated && !isStartAudioChatEmitted) {
      if (microphoneChatId) {
        setIsStartAudioChatEmitted(true);
        toast.info(
          "You've joined an active call. To start a fresh conversation, simply end this call and begin a new one.",
        );
        return;
      }
      const socketData = {
        platform: "WEB",
        sampleRate: 48000,
        mode: mode === "dictation" ? ScribeSessionMode.DICTATION : ScribeSessionMode.SCRIBE,
      };
      emitSocketEvent(SocketEvent.START_AUDIO_CHAT, socketData);
      setIsStartAudioChatEmitted(true);
    }
  }, [microphoneChatId, isSessionCreated, isStartAudioChatEmitted, emitSocketEvent]);

  // Fetch active chat
  useEffect(() => {
    const fetchActiveChat = async () => {
      try {
        const response = await getCounsellorChat();
        if (response) {
          setActiveChat(response.data);
          if (response.data.provider === CallProvider.MICROPHONE) {
            setMicrophoneChatId(response.data.chatId);
          }
        }
      } catch (error) {
        logger.info(`Error fetching active chat:, ${error}`);
        setActiveChat(null);
      }
    };
    fetchActiveChat();
  }, [userId, getCounsellorChat]);

  // Wake lock management
  useEffect(() => {
    // Request wake lock when component mounts and there's an active chat
    const requestWakeLock = async () => {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
          logger.info("Wake Lock is active");
        }
      } catch (err) {
        logger.info(`Wake Lock request failed:${err}`);
      }
    };

    // Request wake lock when component mounts and there's an active chat
    if (activeChat?.chatId || microphoneChatId) {
      requestWakeLock();
    }

    // Handle visibility change to reacquire wake lock when user returns to tab
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && (activeChat?.chatId || microphoneChatId)) {
        try {
          if ("wakeLock" in navigator) {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
            logger.info("Wake Lock reacquired");
          }
        } catch (err) {
          logger.info(`Error reacquiring Wake Lock:${err}`);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup: Release wake lock and remove event listener when component unmounts
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current
          .release()
          .then(() => {
            wakeLockRef.current = null;
            logger.info("Wake Lock released");
          })
          .catch(err => logger.info(`Error releasing Wake Lock:${err}`));
      }
    };
  }, [activeChat?.chatId, microphoneChatId]);

  // Handle page refresh for microphone mode - show browser's default confirmation dialog
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Show browser's default confirmation dialog
      // Note: Browser may remember user's choice after first interaction
      event.preventDefault();
      event.returnValue = "";
    };

    if (isActiveMicrophoneSession) {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.TRANSCRIPTION_GENERATION_VIDEO_SEEN, "false");
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isActiveMicrophoneSession]);

  return {
    activeChat,
    microphoneChatId,
    mediaRecorder,
    isMuted,
    setIsMuted,
    isFocusMode,
    setIsFocusMode,
    speakerTranscriptions,
    myTranscriptions,
    nudges,
    stage,
    isUserJoined,
    socketDisconnectionReason,
    isSessionCreated,
    isEndCallDialogOpen,
    setIsEndCallDialogOpen,
    confirmEndSession,
    isLoading,
    nudgeStatus,
    wakeLockRef,
    isActiveMicrophoneSession,
    connect,
    disconnect,
    isEndSessionDisabled,
    isFocusButtonDisabled,
    isPauseTranscriptionDisabled,
    isSocketDisconnected,
    availableChatTypes,
  };
};
