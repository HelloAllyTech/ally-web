import { SocketDisconnectionReasons } from "@/constants/socket";
import { socketDisconnectionReasonContentMap } from "./constants";

export const getContentByDisconnectionReason = (
  socketDisconnectionReason: SocketDisconnectionReasons,
) => {
  return socketDisconnectionReasonContentMap[socketDisconnectionReason];
};
