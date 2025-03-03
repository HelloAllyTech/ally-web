import {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
  FunctionComponent,
} from "react";
import { useRecoilValue } from "recoil";
import { useNavigate } from "react-router-dom";

import { UserRole } from "@/types/user";
import { MessageType, SocketEvent } from "@/types/message";
import { userState } from "@/store/atoms/userAtom";
import { useClientChat, useCounsellorChat, useSocket } from "@/hooks";
import {
  ICE_SERVERS,
  OFFER_TIMEOUT_MS,
} from "./constants";

const AudioCall: FunctionComponent = () => {
  const [peerConnection, setPeerConnection] =
    useState<RTCPeerConnection | null>(null);
  const [activeChat, setActiveChat] = useState<{ chatId: number } | null>();
  const [muted, setMuted] = useState<boolean>(true);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const offerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const user = useRecoilValue(userState);
  const navigate = useNavigate();

  const isClient = user?.role === UserRole.CLIENT;
  const isCounsellor = user?.role === UserRole.COUNSELOR;

  const {
    getCounsellorChat,
    endSession,
  } = useCounsellorChat();
  const { fetchCurrentChat } = useClientChat();

  const streamText = useCallback((text: string) => {
    setIsStreaming(true);
    let index = 0;
    setCurrentTranscript("");

    const streamInterval = setInterval(() => {
      if (index < text.length) {
        setCurrentTranscript(prev => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(streamInterval);
        setIsStreaming(false);
        setTranscripts(prev => [...prev, text]);
        setCurrentTranscript("");
      }
    }, 30); // Adjust speed as needed

    return () => clearInterval(streamInterval);
  }, []);

  const socketEventCallbacks = useMemo(
    () => ({
      [SocketEvent.NUDGE]: (data: any) => {
        const message = data.payload;
        console.log("Nudge received:", message);
      },
      [SocketEvent.MESSAGE_RECEIVED]: (data: any) => {
        const message = data.payload;
        console.log("Message received:", message);
        if (message.type === MessageType.TEXT) {
          if (message?.content === "Session ended") {
            disconnect();
            navigate("/");
          } else {
            streamText(message.content);
          }
        }
      },
    }),
    [streamText]
  );

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

  const handleWebRTCOffer = useCallback(
    async (data) => {
      if (data.chatId !== activeChat?.chatId) return;

      // Clear any existing timeout
      if (offerTimeoutRef.current) {
        clearTimeout(offerTimeoutRef.current);
      }
      await peerConnection?.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      emitSocketEvent(SocketEvent.START_AUDIO_CHAT, {
        chatId: activeChat?.chatId,
      });

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      emitSocketEvent(SocketEvent.WEBRTC_ANSWER, {
        answer,
        chatId: activeChat?.chatId,
      });
    },
    [activeChat, peerConnection, offerTimeoutRef]
  );

  const handleWebRTCAnswer = useCallback(
    async (data) => {
      if (data.chatId !== activeChat?.chatId) return;

      emitSocketEvent(SocketEvent.START_AUDIO_CHAT, {
        chatId: activeChat?.chatId,
      });
      await peerConnection?.setRemoteDescription(
        new RTCSessionDescription(data.answer)
      );
    },
    [activeChat, peerConnection]
  );

  const handleOnIceCandidate = useCallback(
    (data) => {
      if (data.chatId !== activeChat?.chatId) return;
      peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    },
    [activeChat, peerConnection]
  );

  const initializeMediaRecorderAndSendAudio = (audioTrack, chatId) => {
    if (!audioTrack || !chatId) return;

    const chunks: BlobPart[] = [];
    let totalSize = 0;
    // Create a MediaRecorder to capture audio data
    const recorder = new MediaRecorder(audioTrack, {
      mimeType: "audio/webm",
    });

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

      emitSocketEvent(SocketEvent.AUDIO_MESSAGE, {
        audioData: audioBlob,
        chatId,
      });
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
        totalSize += event.data.size;

        // 🚀 Auto-send when buffer reaches 32 KB
        console.log("totalsize evdaayiii - ", totalSize);
        if (totalSize >= 32000) {
          sendBufferedAudio();
        }
      }
    };

    recorder.onstop = () => {
      sendBufferedAudio();
    };

    setMediaRecorder(recorder);
  };


  useEffect(() => {
    if (!mediaRecorder) return;
    if (!muted) {
      mediaRecorder?.start();
    } else {
      mediaRecorder?.stop();
    }
  }, [muted, mediaRecorder]);

  useEffect(() => {
    if (activeChat && activeChat?.chatId) {
      removeIfListenerPresent(SocketEvent.WEBRTC_OFFER);
      removeIfListenerPresent(SocketEvent.WEBRTC_ANSWER);
      removeIfListenerPresent(SocketEvent.ICE_CANDIDATE);
      setListenerForEvent(SocketEvent.WEBRTC_OFFER, handleWebRTCOffer);
      setListenerForEvent(SocketEvent.WEBRTC_ANSWER, handleWebRTCAnswer);
      setListenerForEvent(SocketEvent.ICE_CANDIDATE, handleOnIceCandidate);
    }
  }, [handleWebRTCOffer, activeChat, handleWebRTCAnswer, handleOnIceCandidate]);

  useEffect(() => {
    const fetchActiveChat = async () => {
      try {
        let data;
        if (user?.role === UserRole.COUNSELOR) {
          data = await getCounsellorChat();
        } else if (user?.role === UserRole.CLIENT) {
          data = await fetchCurrentChat();
        }
        setActiveChat(data);
        if (data?.chatId) {
          connect();

          // Get user media stream
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });

          initializeMediaRecorderAndSendAudio(stream, data?.chatId);
          // Clear any existing timeout
          if (offerTimeoutRef.current) {
            clearTimeout(offerTimeoutRef.current);
          }

          // Create and configure peer connection
          const pc = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
          });

          // Add local tracks to peer connection
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              emitSocketEvent(SocketEvent.ICE_CANDIDATE, {
                candidate: event.candidate,
                chatId: data?.chatId,
              });
            }
          };

          // pc.oniceconnectionstatechange = () => {
          //   console.log("ICE Connection State:", pc.iceConnectionState);
          // };

          // pc.onconnectionstatechange = () => {
          //   console.log("Connection State:", pc.connectionState);
          // };

          pc.ontrack = (event) => {
            // event.streams[0].getTracks().forEach((track) => {
            //   track.onended = () => console.log("Track ended:", track.kind);
            //   track.onmute = () => console.log("Track muted:", track.kind);
            //   track.onunmute = () => console.log("Track unmuted:", track.kind);
            // });
            remoteStreamRef.current = event.streams[0];
          };

          setPeerConnection(pc);

          const createAndSendOffer = async () => {
            const offer = await pc.createOffer({ offerToReceiveAudio: true });
            await pc.setLocalDescription(offer);
            emitSocketEvent(SocketEvent.WEBRTC_OFFER, {
              offer,
              chatId: data?.chatId,
            });
          };

          // Set up delayed offer for both client and counselor
          offerTimeoutRef.current = setTimeout(() => {
            createAndSendOffer();
          }, OFFER_TIMEOUT_MS);

          if (isClient) {
            createAndSendOffer();
          }
        }
      } catch (error) {
        console.error("Error fetching active chat:", error);
        setActiveChat(null);
      }
    };

    fetchActiveChat();

    return () => {
      // Cleanup
      if (offerTimeoutRef.current) {
        clearTimeout(offerTimeoutRef.current);
      }
      if (peerConnection) {
        peerConnection.close();
      }
      disconnect();
    };
  }, [user, isCounsellor, isClient]);

  const confirmEndSession = async () => {
    try {
      sendMessage({
        chatId: activeChat.chatId,
        content: "Session ended",
        context: {},
      });
      await endSession(activeChat.chatId);
      disconnect();
      navigate("/");
    } catch (error) {
      console.error("Error ending session:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        {/* Call Status Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-800">
            {activeChat ? "Active Call" : "Connecting..."}
          </h2>
          <div className="mt-2 flex items-center justify-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300"}`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? "Connected" : "Connecting"}
            </span>
          </div>
        </div>

        {/* Updated Transcript Area */}
        <div className="mb-6 mt-4">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Transcript</h3>
          <div className="bg-gray-50 rounded-lg p-4 h-48 overflow-y-auto">
            {transcripts.length > 0 || currentTranscript ? (
              <>
                {transcripts.map((text, index) => (
                  <p key={index} className="text-gray-600 mb-2">
                    {text}
                  </p>
                ))}
                {currentTranscript && (
                  <p className="text-gray-600 mb-2">
                    {currentTranscript}
                    {isStreaming && (
                      <span className="inline-block animate-pulse">▋</span>
                    )}
                  </p>
                )}
              </>
            ) : (
              <p className="text-gray-400 text-center">No transcript available yet</p>
            )}
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
          autoPlay
          muted={muted}
        />

        {/* Controls */}
        <div className="flex flex-col gap-4">
          <button
            className={`
              flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium transition-all
              ${
                muted
                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                  : "bg-green-100 text-green-600 hover:bg-green-200"
              }
            `}
            onClick={() => setMuted(!muted)}
          >
            {muted ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
                </svg>
                Unmute Microphone
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
                </svg>
                Mute Microphone
              </>
            )}
          </button>

          {isCounsellor && (
            <button
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl font-medium 
                       bg-red-600 text-white hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={confirmEndSession}
              disabled={!isConnected}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              End Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioCall;
