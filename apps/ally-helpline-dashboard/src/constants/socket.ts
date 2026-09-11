export enum SocketConnectionPaths {
  WEBRTC_AUDIO_CALL = "webrtc-audio-chat",
  MICROPHONE_MODE = "microphone-chat",
  CLOUD_TELEPHONY_CHAT = "cloud-telephony-chat",
}

export enum SocketConnectionTypes {
  WEBRTC_AUDIO_CALL = "webrtc-audio-chat",
  MICROPHONE_MODE = "microphone-mode",
  CLOUD_TELEPHONY_CHAT = "cloud-telephony-chat",
}

export const socketConnectMap = {
  [SocketConnectionTypes.WEBRTC_AUDIO_CALL]: SocketConnectionPaths.WEBRTC_AUDIO_CALL,
  [SocketConnectionTypes.MICROPHONE_MODE]: SocketConnectionPaths.MICROPHONE_MODE,
  [SocketConnectionTypes.CLOUD_TELEPHONY_CHAT]: SocketConnectionPaths.CLOUD_TELEPHONY_CHAT,
};

// Why the call screen is showing an error instead of a live session. Named for
// its first use (a dropped socket), but it is the single channel the recording
// screen uses to explain itself — the microphone reasons below never involve
// the socket at all.
export enum SocketDisconnectionReasons {
  NO_NETWORK = "no-network",
  NO_NETWORK_IN_SHARED_SESSION = "no-network-in-shared-session",
  SOMETHING_WENT_WRONG = "something-went-wrong",
  // getUserMedia was refused: the browser permission was denied or dismissed,
  // or the OS/site policy blocks capture. The counsellor has to grant it.
  MICROPHONE_BLOCKED = "microphone-blocked",
  // getUserMedia failed for any other reason: no input device, the device is
  // held by another application, or the browser has no capture support.
  MICROPHONE_UNAVAILABLE = "microphone-unavailable",
}
