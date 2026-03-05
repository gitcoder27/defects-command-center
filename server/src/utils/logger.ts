import pino from "pino";
import { config } from "../config";

export const logger = pino({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: ["req.headers.authorization", "jiraApiToken", "apiToken", "token"],
    censor: "[REDACTED]",
  },
  transport:
    config.NODE_ENV === "production"
      ? undefined
      : {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
});
