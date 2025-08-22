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

export enum SocketDisconnectionReasons {
  NO_NETWORK = "no-network",
  SOMETHING_WENT_WRONG = "something-went-wrong",
}
