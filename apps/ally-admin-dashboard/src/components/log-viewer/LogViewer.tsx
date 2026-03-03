import { useEffect, useRef, useState } from "react";

import { useDispatch, useSelector } from "react-redux";

import { CloseRed, InfoIcon } from "@assets";
import {
  clearLogs,
  selectLogs,
  selectLogViewerVisible,
  selectScenarioReportsSocketStatus,
  setLogViewerVisible,
  SocketConnectionStatus,
  toggleLogViewer,
} from "@reducer";

/*
  This component is used debug the logs in the application.
  For debugging purpose do below steps:
  1. Set the VITE_SHOW_LOG_TERMINAL environment variable to true in the .env file.
  2. Change logger import from @ally-ui-mono/ui-shared to @utils/loggerWithRedux in the file where you want to log the logs.
  2. Refresh the application.
  3. The log viewer will be displayed in the bottom right corner of the screen.
*/
export const LogViewer = () => {
  const dispatch = useDispatch();
  const logs = useSelector(selectLogs);
  const isVisible = useSelector(selectLogViewerVisible);
  const socketStatus = useSelector(selectScenarioReportsSocketStatus);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "L") {
        e.preventDefault();
        dispatch(toggleLogViewer());
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [dispatch]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleClose = () => {
    dispatch(setLogViewerVisible(false));
  };

  const handleClear = () => {
    dispatch(clearLogs());
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "ERROR":
        return "text-red-500";
      case "WARN":
        return "text-yellow-500";
      case "INFO":
        return "text-blue-500";
      case "DEBUG":
        return "text-gray-500";
      default:
        return "text-gray-300";
    }
  };

  const getLevelBg = (level: string) => {
    switch (level) {
      case "ERROR":
        return "bg-red-500/10";
      case "WARN":
        return "bg-yellow-500/10";
      case "INFO":
        return "bg-blue-500/10";
      case "DEBUG":
        return "bg-gray-500/10";
      default:
        return "bg-gray-500/10";
    }
  };

  const getSocketStatusInfo = () => {
    switch (socketStatus.status) {
      case SocketConnectionStatus.CONNECTED:
        return {
          text: "Connected",
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          dotColor: "bg-green-500",
        };
      case SocketConnectionStatus.CONNECTING:
        return {
          text: "Connecting...",
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          dotColor: "bg-blue-500 animate-pulse",
        };
      case SocketConnectionStatus.RECONNECTING:
        return {
          text: `Reconnecting (attempt ${socketStatus.connectionAttempts})`,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          dotColor: "bg-yellow-500 animate-pulse",
        };
      case SocketConnectionStatus.ERROR:
        return {
          text: socketStatus.lastError || "Connection Error",
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          dotColor: "bg-red-500",
        };
      case SocketConnectionStatus.DISCONNECTED:
      default:
        return {
          text: "Disconnected",
          color: "text-gray-500",
          bgColor: "bg-gray-500/10",
          dotColor: "bg-gray-500",
        };
    }
  };

  const statusInfo = getSocketStatusInfo();

  return (
    <>
      <button
        onClick={() => dispatch(toggleLogViewer())}
        className="fixed bottom-4 right-4 z-[9998] p-3 rounded-full shadow-lg transition-all bg-gray-800 text-white"
        title="Toggle logs (Ctrl+Shift+L)"
      >
        <InfoIcon />
      </button>

      {isVisible && (
        <div
          className="fixed z-[9999] w-[600px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl flex flex-col"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            maxHeight: "80vh",
          }}
        >
          <div
            className="px-3 py-3 bg-gray-800 rounded-t-lg cursor-move flex items-center justify-between border-b border-gray-700"
            onMouseDown={handleMouseDown}
          >
            <h3 className="text-sm font-semibold text-gray-100 select-none">Logs</h3>
            <div className="flex items-center gap-4">
              <button
                onClick={handleClear}
                className="px-2 py-1 text-xs text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                title="Clear logs"
              >
                Clear
              </button>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors border border-red-500 rounded-full"
                title="Close"
              >
                <CloseRed />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-4 bg-gray-950">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">No logs yet</div>
            ) : (
              <div className="space-y-1 font-mono text-xs">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className={`p-2 rounded ${getLevelBg(log.level)} flex gap-2 items-start`}
                  >
                    <span className="text-gray-500 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`font-semibold shrink-0 w-14 ${getLevelColor(log.level)}`}>
                      [{log.level}]
                    </span>
                    <span className="text-gray-300 break-all">{log.message}</span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>

          <div className="px-4 py-2 bg-gray-900 border-t border-gray-700 rounded-b-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`} />
                  <span className="text-xs text-gray-400">Scenario Reports Socket:</span>
                </div>
                <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.text}</span>
              </div>
              {socketStatus.connectedAt &&
                socketStatus.status === SocketConnectionStatus.CONNECTED && (
                  <span className="text-xs text-gray-500">
                    Connected at {new Date(socketStatus.connectedAt).toLocaleTimeString()}
                  </span>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
