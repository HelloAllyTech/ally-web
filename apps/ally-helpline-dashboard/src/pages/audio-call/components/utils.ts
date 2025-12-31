import { SocketDisconnectionReasons } from "@constants";

import { socketDisconnectionReasonContentMap } from "./constants";

export const getContentByDisconnectionReason = (
  socketDisconnectionReason: SocketDisconnectionReasons,
) => {
  return socketDisconnectionReasonContentMap[socketDisconnectionReason];
};
