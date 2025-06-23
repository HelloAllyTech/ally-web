import { useCallback, useRef, useState } from "react";

import { ICE_SERVERS } from "@/constants/common";
import { IceServer, SocketEvent } from "@/types/message";
import {
  xirsysChannel,
  xirsysDomain,
  xirsysIdent,
  xirsysSecret,
} from "@/constants/envVariables";

interface UseWebRTCParams {
  emitSocketEvent: (socketEvent: SocketEvent, message: any) => void;
  chatId: number;
  isClient: boolean;
  audioFileSize: number;
  offerTimeoutMs: number;
}

const useWebRTC = ({
  emitSocketEvent,
  chatId,
  isClient,
  audioFileSize,
  offerTimeoutMs,
}: UseWebRTCParams) => {
  // Add a reference to store the local stream
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const offerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [iceServers, setIceServers] = useState<IceServer>();
  const [newIceCandidates, setNewIceCandidates] = useState([]);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [remoteMediaRecorder, setRemoteMediaRecorder] = useState<MediaRecorder | null>(null);

  const fetchIceServers = async () => {
    try {
      const response = await fetch(`${xirsysDomain}/${xirsysChannel}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${xirsysIdent}:${xirsysSecret}`)}`,
        },
        body: JSON.stringify({
          format: "urls",
          domain: window.location.hostname,
          room: "default",
        }),
      });

      const data = await response.json();
      if (data?.v?.iceServers) {
        setIceServers(data.v.iceServers);
      }
    } catch (error) {
      console.error("Failed to fetch ICE servers:", error);
    }
  };

  const setupWebRTCAndMediaRecorder = async () => {
    // Get user media stream (here, audio stream)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

        if (totalSize >= audioFileSize) {
          sendBufferedAudio();
        }
      }
    };

    recorder.onstop = () => {
      if (totalSize < audioFileSize && totalSize > 0) {
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

    // Add local media tracks (here, audio track) to peer connection
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle new ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        emitSocketEvent(SocketEvent.ICE_CANDIDATE, {
          candidate: event.candidate,
          chatId,
        });
      }
    };

    // Add remote media tracks to remote stream
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
      // initiates creation of a Session Description Protocol (SDP) offer for starting the WebRTC connection to a remote peer
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      // sends the offer to the remote peer
      emitSocketEvent(SocketEvent.WEBRTC_OFFER, {
        offer,
        chatId,
      });
    };

    // Set up delayed offer for both client and counselor
    offerTimeoutRef.current = setTimeout(() => {
      createAndSendOffer();
    }, offerTimeoutMs);

    if (isClient) {
      createAndSendOffer();
    }
  };

  // Handle incoming ICE candidates
  const handleOnIceCandidate = useCallback(
    (data) => {
      if (!peerConnection || data.chatId !== chatId) return;
      peerConnection
        .addIceCandidate(new RTCIceCandidate(data.candidate))
        .catch((err) => {
          setNewIceCandidates((prev) => [...prev, data.candidate]);
          console.error(
            "Error adding ICE candidate (Adding in state for future handling):",
            err,
          );
        });
    },
    [chatId, peerConnection],
  );

  // Try to add unattempted ICE candidates to the peer connection
  const handleUnAttemptedIceCandidates = useCallback(() => {
    if (!peerConnection) return;
    if (newIceCandidates.length > 0) {
      newIceCandidates.forEach((candidate) => {
        peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
      });
    }
  }, [peerConnection, newIceCandidates]);

  // Handle incoming WebRTC offer
  const handleWebRTCOffer = useCallback(
    async (data: { chatId: number; offer: RTCSessionDescriptionInit }) => {
      if (data.chatId !== chatId) return;

      // Clear any existing timeout
      if (offerTimeoutRef.current) {
        clearTimeout(offerTimeoutRef.current);
      }
      // Set the incoming offer as the remote description
      await peerConnection?.setRemoteDescription(
        new RTCSessionDescription(data.offer),
      );

      handleUnAttemptedIceCandidates();

      emitSocketEvent(SocketEvent.START_AUDIO_CHAT, {
        chatId,
      });

      // Create an answer for the offer and set it as the local description
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send the answer to the remote peer
      emitSocketEvent(SocketEvent.WEBRTC_ANSWER, {
        answer,
        chatId,
      });
    },
    [chatId, peerConnection, offerTimeoutRef, handleUnAttemptedIceCandidates],
  );

  // Handle incoming WebRTC answer
  const handleWebRTCAnswer = useCallback(
    async (data: { chatId: number; answer: RTCSessionDescriptionInit }) => {
      if (data.chatId !== chatId) return;

      emitSocketEvent(SocketEvent.START_AUDIO_CHAT, {
        chatId,
      });

      // Set the incoming answer as the remote description
      await peerConnection?.setRemoteDescription(
        new RTCSessionDescription(data.answer),
      );

      handleUnAttemptedIceCandidates();
    },
    [chatId, peerConnection, handleUnAttemptedIceCandidates],
  );

  return {
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
  };
};

export default useWebRTC;
