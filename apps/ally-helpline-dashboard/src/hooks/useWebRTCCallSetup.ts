import { useCallback, useRef, useState } from "react";

import { logger } from "@ally-ui-mono/ui-shared";
import { ICE_SERVERS } from "@constants";
import { IceServer, SocketEvent } from "@types";
import { xirsysChannel, xirsysDomain, xirsysIdent, xirsysSecret } from "@constants";

interface UseWebRTCParams {
  emitSocketEvent: (socketEvent: SocketEvent, message: any) => void;
  chatId: number;
  isClient: boolean;
  offerTimeoutMs: number;
}

export const useWebRTCCallSetup = ({
  emitSocketEvent,
  chatId,
  isClient,
  offerTimeoutMs,
}: UseWebRTCParams) => {
  // Add a reference to store the local stream
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const offerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [iceServers, setIceServers] = useState<IceServer>();
  const [newIceCandidates, setNewIceCandidates] = useState([]);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [remoteMediaRecorder, setRemoteMediaRecorder] = useState<MediaRecorder | null>(null);

  /**
   * Fetches ICE servers from XirSys service for WebRTC connection.
   * - Makes a PUT request to XirSys API
   * - Authenticates using Basic Auth with XirSys credentials
   * - Requests ICE servers for the current domain
   * - Updates the iceServers state with fetched configuration
   */
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
      try {
        const data = await response.json();
        if (data?.v?.iceServers) {
          setIceServers(data.v.iceServers);
        }
      } catch (error) {
        logger.info(`Error parsing ICE servers response:, ${error}`);
      }
    } catch (error) {
      logger.info(`Failed to fetch ICE servers:, ${error}`);
    }
  };

  /**
   * Sets up WebRTC peer connection and media streams.
   * - Requests user media (audio) permissions
   * - Creates RTCPeerConnection with ICE servers
   * - Adds local media tracks to peer connection
   * - Sets up ICE candidate handling
   * - Sets up remote track handling with recording
   * - Creates and sends offer if client, or waits for offer if not
   */
  const setupWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      if (offerTimeoutRef.current) {
        clearTimeout(offerTimeoutRef.current);
      }
      const xirsysServers =
        iceServers?.urls?.length > 0
          ? [{ ...iceServers, urls: iceServers.urls.slice(0, 4) }]
          : ICE_SERVERS;
      const pc = new RTCPeerConnection({
        iceServers: xirsysServers,
      });
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      pc.onicecandidate = event => {
        if (event.candidate) {
          emitSocketEvent(SocketEvent.ICE_CANDIDATE, {
            candidate: event.candidate,
            chatId,
          });
        }
      };
      pc.ontrack = event => {
        remoteStreamRef.current = event.streams[0];
        const remoteRecorder = new MediaRecorder(event.streams[0], {
          mimeType: "audio/webm",
        });
        remoteRecorder.start(500);
        setRemoteMediaRecorder(remoteRecorder);
      };
      setPeerConnection(pc);
      const createAndSendOffer = async () => {
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);
          emitSocketEvent(SocketEvent.WEBRTC_OFFER, {
            offer,
            chatId,
          });
        } catch (error) {
          logger.info(`Error creating or sending offer:, ${error}`);
        }
      };
      offerTimeoutRef.current = setTimeout(() => {
        createAndSendOffer();
      }, offerTimeoutMs);
      if (isClient) {
        createAndSendOffer();
      }
    } catch (error) {
      logger.info(`Error setting up WebRTC:, ${error}`);
    }
  };

  /**
   * Handles incoming ICE candidates from the remote peer.
   * - Validates that the candidate belongs to the current chat
   * - Adds the ICE candidate to the peer connection
   * - Stores failed candidates for later retry
   * - Logs errors for debugging
   * @param {Object} data - ICE candidate data from socket
   * @param {RTCIceCandidate} data.candidate - ICE candidate object
   * @param {number} data.chatId - Chat ID for validation
   */
  const handleOnIceCandidate = useCallback(
    data => {
      if (!peerConnection || data.chatId !== chatId) return;
      peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)).catch(err => {
        setNewIceCandidates(prev => [...prev, data.candidate]);
        logger.info(`Error adding ICE candidate (Adding in state for future handling):, ${err}`);
      });
    },
    [chatId, peerConnection],
  );

  /**
   * Attempts to add previously failed ICE candidates to the peer connection.
   * - Checks if there are unattempted ICE candidates
   * - Adds each candidate to the peer connection
   * - Clears the candidates array after processing
   */
  const handleUnAttemptedIceCandidates = useCallback(() => {
    if (!peerConnection) return;
    if (newIceCandidates.length > 0) {
      newIceCandidates.forEach(candidate => {
        peerConnection?.addIceCandidate(new RTCIceCandidate(candidate));
      });
    }
  }, [peerConnection, newIceCandidates]);

  /**
   * Handles incoming WebRTC offers from the remote peer.
   * - Validates that the offer belongs to the current chat
   * - Sets the remote description with the offer
   * - Processes any unattempted ICE candidates
   * - Creates and sends an answer back to the remote peer
   * - Emits start audio chat event
   * @param {Object} data - WebRTC offer data from socket
   * @param {number} data.chatId - Chat ID for validation
   * @param {RTCSessionDescriptionInit} data.offer - WebRTC offer object
   */
  const handleWebRTCOffer = useCallback(
    async (data: { chatId: number; offer: RTCSessionDescriptionInit }) => {
      if (data.chatId !== chatId) return;
      if (offerTimeoutRef.current) {
        clearTimeout(offerTimeoutRef.current);
      }
      try {
        await peerConnection?.setRemoteDescription(new RTCSessionDescription(data.offer));
        handleUnAttemptedIceCandidates();
        emitSocketEvent(SocketEvent.START_AUDIO_CHAT, {
          chatId,
        });
        try {
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          emitSocketEvent(SocketEvent.WEBRTC_ANSWER, {
            answer,
            chatId,
          });
        } catch (error) {
          logger.info(`Error creating or setting local answer:, ${error}`);
        }
      } catch (error) {
        logger.info(`Error handling WebRTC offer:, ${error}`);
      }
    },
    [chatId, peerConnection, offerTimeoutRef, handleUnAttemptedIceCandidates],
  );

  /**
   * Handles incoming WebRTC answers from the remote peer.
   * - Validates that the answer belongs to the current chat
   * - Sets the remote description with the answer
   * - Processes any unattempted ICE candidates
   * - Emits start audio chat event
   *
   * @param {Object} data - WebRTC answer data from socket
   * @param {number} data.chatId - Chat ID for validation
   * @param {RTCSessionDescriptionInit} data.answer - WebRTC answer object
   */
  const handleWebRTCAnswer = useCallback(
    async (data: { chatId: number; answer: RTCSessionDescriptionInit }) => {
      if (data.chatId !== chatId) return;
      emitSocketEvent(SocketEvent.START_AUDIO_CHAT, {
        chatId,
      });
      try {
        await peerConnection?.setRemoteDescription(new RTCSessionDescription(data.answer));
        handleUnAttemptedIceCandidates();
      } catch (error) {
        logger.info(`Error handling WebRTC answer:, ${error}`);
      }
    },
    [chatId, peerConnection, handleUnAttemptedIceCandidates],
  );

  return {
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
  };
};
