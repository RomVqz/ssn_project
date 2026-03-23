import winston from "winston";

const { combine, timestamp, colorize, printf, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack ?? message}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    colorize(),
    logFormat
  ),
  transports: [new winston.transports.Console()],
});
