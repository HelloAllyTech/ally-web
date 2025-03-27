import { useSelector } from "react-redux";
import Divider from "@mui/material/Divider";
import { useNavigate } from "react-router-dom";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LiveAudioVisualizer } from "react-audio-visualize";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Close,
  Record,
  CutCall,
  FocusOn,
  NoRecord,
  FocusOff,
  LifelineLogo,
} from "@/assets/icons";
import { UserRole } from "@/types/user";
import { RootState } from "@/store/store";
import { CustomMarkdown } from "@/components";
import { ICE_SERVERS } from "@/constants/common";
import { useIceServers, useSocket } from "@/hooks";
import { MessageType, SocketEvent } from "@/types/message";

import "./CallTranscript.css";
import { formatTime } from "./utils";
import { CallTranscriptProps, Transcription } from "./types";
import { AUDIO_FILE_SIZE, OFFER_TIMEOUT_MS } from "./constants";
import AudioCallBackgroundWrapper from "./components/AudioCallBackgroundWrapper";

// TODO: Uninstall react-audio-voice-recorder
// TODO: Split transcription to client-counselor
// TODO: Try to make it more similar to Figma
// TODO: Responsiveness
// TODO: Blurry effect at the top and bottom of the conversation
// TODO: Add streaming effect in transcription
// TODO: Find firefox issue
// TODO: Bug with no trascript intermittently
// TODO: start Audio chat not send sometimes

const CallTranscript = (props: CallTranscriptProps) => {
  const { endSession, activeChat } = props;
  const chatId = useMemo(() => activeChat.chatId, [activeChat]);
  const [seconds, setSeconds] = useState(0);
  const [focus, setFocus] = useState(true);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [muted, setMuted] = useState<boolean>(true);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const offerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [remoteMediaRecorder, setRemoteMediaRecorder] =
    useState<MediaRecorder | null>(null);

  const user = useSelector((state: RootState) => state.user.user);
  const navigate = useNavigate();
  const iceServers = useIceServers();

  const [speakerTranscriptions, setSpeakerTranscriptions] = useState<
    Transcription[]
  >([]);
  const [myTranscriptions, setMyTranscriptions] = useState<Transcription[]>([]);
  const [nudges, setNudges] = useState<string[]>([]);
  const [stage, setStage] = useState<string>();
  const [newIceCandidates, setNewIceCandidates] = useState([]);
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const isClient = user?.role === UserRole.CLIENT;
  const isCounsellor = user?.role === UserRole.COUNSELOR;

  const processTranscription = (
    setCorrespondingTranscription: React.Dispatch<
      React.SetStateAction<Transcription[]>
    >,
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
        const message = data.payload;
        console.log("Nudge received:", message);
        if (message.type === MessageType.NUDGE) {
          setNudges((prev) => [...prev, message.content]);
        }
      },
      [SocketEvent.MESSAGE_RECEIVED]: (data: any) => {
        const payload = data.payload;
        console.log("Message received:", payload);
        if (payload.type === MessageType.TEXT) {
          if (payload.senderId === user?.userId) {
            processTranscription(setMyTranscriptions, payload);
          } else {
            processTranscription(setSpeakerTranscriptions, payload);
          }
        }
      },
    }),
    []
  );

  useEffect(() => {
    if (activeChat.messages && activeChat.messages.length > 0) {
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
    isConnected,
    sendMessage,
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

  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const nudgesContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (transcriptContainerRef.current && focus && !isUserScrolling) {
      // Add a small delay to ensure content is rendered before scrolling
      setTimeout(() => {
        if (transcriptContainerRef.current) {
          transcriptContainerRef.current.scrollTo({
            top: transcriptContainerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [transcriptions, focus, isUserScrolling]);

  // Add this effect to scroll to bottom when nudges change
  useEffect(() => {
    if (nudgesContainerRef.current && focus) {
      nudgesContainerRef.current.scrollTop =
        nudgesContainerRef.current.scrollHeight;
    }
  }, [nudges, focus]);

  // Add this new function to handle scroll events
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const isAtBottom =
      Math.abs(
        container.scrollHeight - container.scrollTop - container.clientHeight
      ) < 1;

    setIsUserScrolling(!isAtBottom);
  };

  const getSpeakerName = (senderId: number, previousSenderId: number) => {
    if (previousSenderId && previousSenderId == senderId) return "";
    return senderId === user?.userId ? "You:" : "Client:";
  };

  return (
    <div className="w-screen h-screen flex justify-center items-center">
      <AudioCallBackgroundWrapper>
        <>
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
                      .catch((e) => console.error("Audio playback failed:", e));
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

          {/* Update transcription container with max-height */}
          {isCounsellor && (
            <motion.div
              className="w-[85%] h-[35vh] flex flex-col overflow-hidden"
              initial={{ height: 0 }}
              animate={{ height: focus ? "35vh" : 0 }}
              exit={{ height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <h3 className="text-white mb-4 self-start ">
                Real-time Transcription
              </h3>
              <Divider
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.12)",
                  width: "50%",
                  marginBottom: "10px",
                }}
              />
              <div
                ref={transcriptContainerRef}
                className="z-10 flex-1 overflow-y-auto text-white rounded-lg p-4 
                  transition-all duration-500 ease-in-out custom-scrollbar mb-20 flex flex-col gap-2"
                onScroll={handleScroll}
              >
                {transcriptions.map((transcriptionObj, index) => (
                  <div key={transcriptionObj.id} className="flex">
                    <div className="font-bold w-[20%]">
                      {getSpeakerName(
                        transcriptionObj.senderId,
                        index > 0 && transcriptions[index - 1].senderId
                      )}
                    </div>
                    <div
                      key={index}
                      className="typing-animation w-full"
                      style={{
                        animationDelay: `${index * 100}ms`,
                      }}
                    >
                      {transcriptionObj.message}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <div className="z-10 absolute bottom-10 w-full flex justify-center items-center gap-4">
            <button onClick={() => setMuted((prev) => !prev)}>
              {muted ? <NoRecord /> : <Record />}
            </button>
            {isCounsellor && (
              <button>
                {focus ? (
                  <FocusOn onClick={() => setFocus(false)} />
                ) : (
                  <FocusOff onClick={() => setFocus(true)} />
                )}
              </button>
            )}
            <button onClick={() => confirmEndSession(true)}>
              <CutCall />
            </button>
          </div>
        </>
      </AudioCallBackgroundWrapper>
      <AnimatePresence>
        {isCounsellor && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: focus ? 500 : 0 }}
            exit={{ width: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full bg-[#12151F] overflow-hidden"
          >
            <div className="border-b border-b-[#292929] h-14 px-4 flex justify-between items-center">
              <div className="font-bold text-white">Copilot</div>
              <Close
                className="cursor-pointer"
                onClick={() => setFocus(false)}
              />
            </div>
            {stage && (
              <div className="m-4 px-6 py-4 border border-[#01D966] rounded-lg bg-[#01D96626]">
                <div className="text-base font-medium text-[#01D966] ">
                  Current Stage
                </div>
                <div className="text-white text-base">{stage}</div>
              </div>
            )}
            <div
              ref={nudgesContainerRef}
              className="p-4 h-[calc(100vh-10.4rem)] overflow-y-auto custom-scrollbar"
            >
              {nudges?.map((nudge, index) => (
                <div
                  className="bg-[#1C1F2A] rounded-lg p-4 mb-2"
                  key={`nudge-${index}`}
                >
                  <LifelineLogo />
                  <CustomMarkdown content={nudge} />
                  <Divider
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.12)",
                    }}
                  />
                  <div className="flex text-sm items-center gap-2 text-[#BABABA]">
                    <span>Does this help?</span>
                    <button className="hover:bg-[#292929] p-2 rounded-lg transition-colors">
                      <ThumbsDown className="w-5 h-5" />
                    </button>
                    <button className="hover:bg-[#292929] p-2 rounded-lg transition-colors">
                      <ThumbsUp className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CallTranscript;
