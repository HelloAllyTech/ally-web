export enum SocketConnectionPaths {
    WEBRTC_AUDIO_CALL = "webrtc-audio-chat",
    MICROPHONE_MODE = "microphone-chat",
  }
  
  export enum SocketConnectionTypes {
    WEBRTC_AUDIO_CALL = "webrtc-audio-chat",
    MICROPHONE_MODE = "microphone-mode",
  }
  
  export const socketConnectMap = {
    [SocketConnectionTypes.WEBRTC_AUDIO_CALL]: SocketConnectionPaths.WEBRTC_AUDIO_CALL,
    [SocketConnectionTypes.MICROPHONE_MODE]: SocketConnectionPaths.MICROPHONE_MODE,
  };