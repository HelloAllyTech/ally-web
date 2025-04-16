import { FC, useEffect, useMemo, useRef, useState, Dispatch, SetStateAction, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LiveAudioVisualizer } from "react-audio-visualize";

import {
  Record,
  CutCall,
  FocusOn,
  NoRecord,
  FocusOff,
} from "@/assets/icons";
import { UserRole } from "@/types/user";
import { RootState } from "@/store/store";
import { ICE_SERVERS } from "@/constants/common";
import { useIceServers, useSocket } from "@/hooks";
import { MessageType, SocketEvent } from "@/types/message";

import "./CallTranscript.css";
import { formatTime } from "./utils";
import { CallTranscriptProps, Transcription } from "./types";
import { AUDIO_FILE_SIZE, OFFER_TIMEOUT_MS } from "./constants";
import AudioCallBackgroundWrapper from "./components/AudioCallBackgroundWrapper";
import CallSidebar from "./components/CallSidebar";
import RealTimeTranscript from "./components/RealTimeTranscript";

// TODO: Uninstall react-audio-voice-recorder
// TODO: Split transcription to client-counselor
// TODO: Try to make it more similar to Figma
// TODO: Responsiveness
// TODO: Blurry effect at the top and bottom of the conversation
// TODO: Add streaming effect in transcription
// TODO: Find firefox issue
// TODO: Bug with no trascript intermittently
// TODO: start Audio chat not send sometimes

const CallTranscript: FC<CallTranscriptProps> = ({ endSession, activeChat }) => {
  const navigate = useNavigate();
  const iceServers = useIceServers();

  const user = useSelector((state: RootState) => state.user.user);
  const chatId = useMemo(() => activeChat.chatId, [activeChat]);

  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const offerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [seconds, setSeconds] = useState(0);
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [muted, setMuted] = useState<boolean>(true);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [remoteMediaRecorder, setRemoteMediaRecorder] = useState<MediaRecorder | null>(null);
  const [speakerTranscriptions, setSpeakerTranscriptions] = useState<Transcription[]>([]);
  const [myTranscriptions, setMyTranscriptions] = useState<Transcription[]>([]);
  const [nudges, setNudges] = useState<string[]>([]);
  const [stage, setStage] = useState<string>();
  const [newIceCandidates, setNewIceCandidates] = useState([]);
  const [isUserJoined, setIsUserJoined] = useState(null);

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
    payload: any
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
      [SocketEvent.STAGE]: (data: any) => {
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
      [SocketEvent.NUDGE]: (data: any) => {
        const nudge = data.payload;
        console.log("Nudge received:", nudge);
        if (nudge.type === MessageType.NUDGE) {
          setNudges((prev) => [...prev, nudge.content]);
        }
      },
      [SocketEvent.MESSAGE_RECEIVED]: (data: any) => {
        const message = data.payload;
        console.log("Message received:", message);
        if (message.type === MessageType.TEXT) {
          if (message.senderId === user?.userId) {
            processTranscription(setMyTranscriptions, message);
          } else {
            processTranscription(setSpeakerTranscriptions, message);
          }
        }
      },
      [SocketEvent.UTTERANCE_ENDED]: (data: any) => {
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

  useEffect(() => {
    if (activeChat.messages && activeChat.messages.length > 0) {
      // TODO: currentStage is not present in the chat object
      if (activeChat?.currentStage) {
        setStage(activeChat?.currentStage);
      }
      const existingTranscriptions = activeChat.messages
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

      const existingNudges = activeChat.messages
        .reverse()
        .filter((message) => message.type === MessageType.NUDGE)
        .map((nudge) => nudge.content);
      setNudges(existingNudges);
    }
  }, [activeChat]);

  const {
    connect,
    disconnect,
    emitSocketEvent,
    setListenerForEvent,
    removeIfListenerPresent,
  } = useSocket({
    userId: user.userId,
    eventCallbacks: socketEventCallbacks,
  });

  useEffect(() => {
    if (muted) {
      emitSocketEvent(SocketEvent.AUDIO_CHAT_MUTED, { chatId });
    }
  }, [muted]);

  // TODO: REthink the logic
  useEffect(() => {
    if (!activeChat?.startedAt) return;

    const updateElapsedTime = () => {
      const now = Date.now();
      const diffInSeconds = Math.floor(
        (now - Date.parse(activeChat.startedAt)) / 1000
      );
      setSeconds(diffInSeconds);
    };

    updateElapsedTime(); // Initial update
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval); // Cleanup on unmount
  }, [activeChat]);

  // Add a reference to store the local stream
  const localStreamRef = useRef<MediaStream | null>(null);

  const setupWebrtcAndMediarecorder = async () => {
    // Get user media stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    // Store the stream reference
    localStreamRef.current = stream;

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
      fileReader.readAsArrayBuffer(audioBlob);
      fileReader.onloadend = () => {
        const resultantAudioData = fileReader.result;
        emitSocketEvent(SocketEvent.AUDIO_MESSAGE, {
          audioData: resultantAudioData,
          chatId,
        });
      };
    };

    recorder.ondataavailable = (event) => {
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

    // Setup webrtc connection
    // Clear any existing timeout
    if (offerTimeoutRef.current) {
      clearTimeout(offerTimeoutRef.current);
    }

    // Create and configure peer connection
    const pc = new RTCPeerConnection({
      iceServers: iceServers?.urls?.length > 0 ? [iceServers] : ICE_SERVERS, // Fallback STUN server
    });

    // Add local tracks to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        emitSocketEvent(SocketEvent.ICE_CANDIDATE, {
          candidate: event.candidate,
          chatId,
        });
      }
    };
    pc.ontrack = (event) => {
      // event.streams[0].getTracks().forEach((track) => {
      //   track.onended = () => console.log("Track ended:", track.kind);
      //   track.onmute = () => console.log("Track muted:", track.kind);
      //   track.onunmute = () => console.log("Track unmuted:", track.kind);
      // });
      remoteStreamRef.current = event.streams[0];

      // Create MediaRecorder for remote stream
      const remoteRecorder = new MediaRecorder(event.streams[0], {
        mimeType: "audio/webm",
      });
      remoteRecorder.start(500);
      setRemoteMediaRecorder(remoteRecorder);
    };

    setPeerConnection(pc);

    const createAndSendOffer = async () => {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      emitSocketEvent(SocketEvent.WEBRTC_OFFER, {
        offer,
        chatId,
      });
    };

    // Set up delayed offer for both client and counselor
    offerTimeoutRef.current = setTimeout(() => {
      createAndSendOffer();
    }, OFFER_TIMEOUT_MS);

    if (isClient) {
      createAndSendOffer();
    }
  };

  useEffect(() => {
    if (chatId && user && iceServers) {
      //connect socket
      connect(chatId);
      setupWebrtcAndMediarecorder();
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
    if (muted) {
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
  }, [muted, mediaRecorder]);

  const handleUnAttemptedIceCandidates = useCallback(() => {
    if (!peerConnection) return;
    if (newIceCandidates.length > 0) {
      newIceCandidates.forEach((candidate) => {
        peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
      });
    }
  }, [peerConnection, newIceCandidates]);

  const handleOnIceCandidate = useCallback(
    (data) => {
      if (!peerConnection || data.chatId !== chatId) return;
      peerConnection
        .addIceCandidate(new RTCIceCandidate(data.candidate))
        .catch((err) => {
          setNewIceCandidates((prev) => [...prev, data.candidate]);
          console.error(
            "Error adding ICE candidate (Adding in state for future handling):",
            err
          );
        });
    },
    [chatId, peerConnection]
  );

  const handleWebRTCOffer = useCallback(
    async (data) => {
      if (data.chatId !== chatId) return;

      // Clear any existing timeout
      if (offerTimeoutRef.current) {
        clearTimeout(offerTimeoutRef.current);
      }
      await peerConnection?.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      handleUnAttemptedIceCandidates();

      emitSocketEvent(SocketEvent.START_AUDIO_CHAT, {
        chatId,
      });

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      emitSocketEvent(SocketEvent.WEBRTC_ANSWER, {
        answer,
        chatId,
      });
    },
    [chatId, peerConnection, offerTimeoutRef, handleUnAttemptedIceCandidates]
  );

  const handleWebRTCAnswer = useCallback(
    async (data) => {
      if (data.chatId !== chatId) return;

      emitSocketEvent(SocketEvent.START_AUDIO_CHAT, {
        chatId,
      });
      await peerConnection?.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
      handleUnAttemptedIceCandidates();
    },
    [chatId, peerConnection, handleUnAttemptedIceCandidates]
  );

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
      endSession(triggerApi);
      disconnect();
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  const reduceTranscriptions = (
    transcriptions: Transcription[]
  ): Transcription[] => {
    return transcriptions.reduce(
      (acc: Transcription[], current: Transcription) => {
        if (acc.length === 0) {
          return [current];
        }

        const last = acc[acc.length - 1];

        // If the last transcription is not sentence complete, combine with current
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
      },
      []
    );
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

  const getEmptyScreen = () => {
    let message;
    if (isUserJoined === false) {
      message = isCounsellor
        ? "Participant left the call"
        : "Counsellor left the call";
    } else if (!isUserJoined) {
      message = isCounsellor
        ? "Session is starting now.."
        : "Connecting to your counselor...";
    }
    return (
      <motion.div
        key={message}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-white text-4xl font-normal">{message}</div>
        {!(isUserJoined == null) && (
          <div className="text-[#BABABA] text-sm text-center mt-1">
            You can wait for them to rejoin or end the call.
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <AudioCallBackgroundWrapper>
        <>
          {isUserJoined ? (
            <div
              className="flex flex-col justify-center items-center
                gap-4 z-10 transition-all duration-500 ease-in-out min-h-[30vh]"
            >
              <div className="text-white flex justify-center items-center flex-col gap-2">
                <div className="text-base font-medium">Ongoing Voice Call</div>
                <div className="text-sm text-[#BABABA]">
                  {formatTime(seconds)}
                </div>
              </div>
              {/* Hidden Audio Element */}
              <audio
                ref={(audio) => {
                  if (audio) {
                    audio.srcObject = remoteStreamRef.current;
                    audio.onloadedmetadata = () => {
                      audio
                        .play()
                        .catch((e) =>
                          console.error("Audio playback failed:", e)
                        );
                    };
                  }
                }}
                muted={false}
                autoPlay
              />
              <div className="relative gap-1 flex rounded-lg">
                {remoteMediaRecorder && (
                  <div className="rotate-180 z-0 translate-x-[4px] translate-y-[1px]">
                    <LiveAudioVisualizer
                      mediaRecorder={remoteMediaRecorder}
                      width={200}
                      height={200}
                      barWidth={4}
                      barColor="#FFFFFF"
                    />
                  </div>
                )}
                {mediaRecorder && (
                  <div className="z-0">
                    <LiveAudioVisualizer
                      mediaRecorder={mediaRecorder}
                      width={200}
                      height={200}
                      barWidth={4}
                      barColor="#FFFFFF"
                    />
                  </div>
                )}
                <div className="waveForm rounded-full absolute top-[38%] left-0 w-1/6 h-1/4 " />
                <div className="waveForm rounded-full absolute top-[38%] right-0 w-1/6 h-1/4 rotate-180" />
              </div>
            </div>
          ) : (
            getEmptyScreen()
          )}

          {/* Update transcription container with max-height */}
          {isCounsellor && isUserJoined && (
            <RealTimeTranscript isFocusMode={isFocusMode} transcriptions={transcriptions} />
          )}

          <div className="z-10 absolute bottom-10 w-full flex justify-center items-center gap-4">
            <button
              disabled={!isUserJoined}
              onClick={() => setMuted((prev) => !prev)}
            >
              {muted ? <NoRecord /> : <Record />}
            </button>
            {isCounsellor && (
              <button disabled={!isUserJoined}>
                {isFocusMode ? (
                  <FocusOn onClick={() => setIsFocusMode(false)} />
                ) : (
                  <FocusOff onClick={() => setIsFocusMode(true)} />
                )}
              </button>
            )}
            <button onClick={() => confirmEndSession(true)}>
              <CutCall />
            </button>
          </div>
        </>
      </AudioCallBackgroundWrapper>
      <CallSidebar
        isCounsellor={isCounsellor}
        isFocusMode={isFocusMode}
        isUserJoined={isUserJoined}
        nudges={nudges}
        onClose={() => setIsFocusMode(false)}
        stage={stage}
      />
    </div>
  );
};

export default CallTranscript;
