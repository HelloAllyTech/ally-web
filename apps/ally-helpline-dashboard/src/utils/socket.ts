import { SocketConnectionTypes, socketConnectMap } from "@constants";

export const getPathForConnectionType = (connectionType: SocketConnectionTypes) => {
  return socketConnectMap[connectionType];
};
