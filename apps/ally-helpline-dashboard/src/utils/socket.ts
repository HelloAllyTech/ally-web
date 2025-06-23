import { SocketConnectionTypes, socketConnectMap } from "@/constants/socket";

export const getPathForConnectionType = (connectionType: SocketConnectionTypes) => {
  return socketConnectMap[connectionType];
};