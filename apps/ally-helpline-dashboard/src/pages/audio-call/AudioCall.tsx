import { useRef, useMemo, useState, useEffect, useCallback } from "react";
import { useRecoilValue } from "recoil";
import { useNavigate } from "react-router-dom";

import { UserRole } from "@/types/user";
import { MessageType, SocketEvent } from "@/types/message";
import { userState } from "@/store/atoms/userAtom";
import { useClientChat, useCounsellorChat, useSocket } from "@/hooks";

const AudioCall = () => {
  const [peerConnection, setPeerConnection] = useState(null);
  const [activeChat, setActiveChat] = useState<any | null>();
  const [muted, setMuted] = useState(true);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const user = useRecoilValue(userState);
  const navigate = useNavigate();

  const isClient = user?.role === UserRole.CLIENT;
  const isCounsellor = user?.role === UserRole.COUNSELOR;

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [recordingInterval, setRecordingInterval] =
    useState<NodeJS.Timeout | null>(null);

  const handleWebRTCOffer = useCallback(
    async (data) => {
      if (data.chatId !== activeChat?.chatId) return;
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
    [activeChat, peerConnection]
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
          }
        }
      },
    }),
    []
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

  const sendAudioToBackend = useCallback(
    (audioTrack, chatId) => {
      if (!audioTrack || !chatId) return;

      // Stop existing recorder if any
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }

      // Create a MediaRecorder to capture audio data
      const recorder = new MediaRecorder(new MediaStream([audioTrack]));
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (chunks.length > 0) {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          emitSocketEvent(SocketEvent.AUDIO_MESSAGE, {
            audio: audioBlob,
            chatId,
          });
          chunks.length = 0;
        }
      };

      setMediaRecorder(recorder);

      // Only start recording if not muted
      if (!muted) {
        recorder.start();
        const interval = setInterval(() => {
          if (recorder.state === "recording") {
            recorder.stop();
            recorder.start();
          }
        }, 5000);
        setRecordingInterval(interval);
      }
    },
    [muted, emitSocketEvent]
  );

  // Add effect to handle mute state changes
  useEffect(() => {
    if (!localStreamRef.current) return;

    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (!audioTrack) return;

    if (muted) {
      // Stop recording when muted
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    } else {
      // Start recording when unmuted
      sendAudioToBackend(audioTrack, activeChat?.chatId);
    }
  }, [muted, sendAudioToBackend, activeChat?.chatId]);

  const {
    getCounsellorChat,
    endSession,
    isLoading: isEndSessionLoading,
  } = useCounsellorChat();

  const { fetchCurrentChat } = useClientChat();

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
          localStreamRef.current = stream;
          sendAudioToBackend(stream.getAudioTracks()[0], data?.chatId);

          // Create and configure peer connection
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
            ],
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

          if (isClient) {
            const offer = await pc.createOffer({ offerToReceiveAudio: true });
            await pc.setLocalDescription(offer);
            emitSocketEvent(SocketEvent.WEBRTC_OFFER, {
              offer,
              chatId: data?.chatId,
            });
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
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
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
