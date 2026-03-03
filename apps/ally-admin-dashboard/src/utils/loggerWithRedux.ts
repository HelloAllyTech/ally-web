import { logger as baseLogger } from "@ally-ui-mono/ui-shared";
import { addLog } from "@reducer";
import { store } from "@store";

enum LogLevel {
  INFO = "info",
  ERROR = "error",
  WARN = "warn",
  DEBUG = "debug",
}

export const logger = {
  log: (level: LogLevel, message: string) => {
    // Call the base logger
    baseLogger.log(level, message);

    // Also dispatch to Redux for UI display
    const isVite = typeof import.meta !== "undefined" && import.meta.env;
    const logger_enabled = isVite ? import.meta.env.MODE === "development" : false;

    if (logger_enabled) {
      const timestamp = new Date().toISOString();
      const levelString = level.toUpperCase();

      store.dispatch(
        addLog({
          timestamp,
          level: levelString,
          message,
        }),
      );
    }
  },

  error(error: string) {
    this.log(LogLevel.ERROR, error);
  },

  info(message: string) {
    this.log(LogLevel.INFO, message);
  },

  warn(warning: string) {
    this.log(LogLevel.WARN, warning);
  },

  debug(message: string) {
    this.log(LogLevel.DEBUG, message);
  },
};
