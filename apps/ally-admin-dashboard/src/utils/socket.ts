import { socketConnectionMap, SocketConnectionTypes } from "@src/constants/socket";

export const getPathForConnectionType = (connectionType: SocketConnectionTypes) => {
  return socketConnectionMap[connectionType];
};
