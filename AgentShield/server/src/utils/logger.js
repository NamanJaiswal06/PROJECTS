/**
 * logger.js — Structured application logger built on Winston.
 *
 * Why Winston instead of console.log?
 *   - console.log has no log levels; everything goes to stdout equally
 *   - Winston supports levels (error > warn > info > http > debug),
 *     so in production you can suppress debug noise with LOG_LEVEL=info
 *   - Winston outputs structured JSON in production, which log aggregators
 *     (Datadog, CloudWatch, Elastic) can parse and query
 *   - In development, it outputs colorized human-readable text
 *
 * Security:
 *   NEVER log passwords, JWT tokens, API keys, or credential fields here.
 *   The logger itself does not sanitize — callers are responsible for
 *   not passing sensitive data into log messages or meta objects.
 */
const winston = require("winston");

const { NODE_ENV, LOG_LEVEL } = process.env;

// ─── Custom log format for development ────────────────────────────────────────
// Shows: [LEVEL] timestamp message  key=value key=value ...
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? "  " + JSON.stringify(meta, null, 0)
      : "";
    return `[${level}] ${timestamp}  ${message}${metaStr}`;
  })
);

// ─── JSON format for production ───────────────────────────────────────────────
// Machine-readable; includes timestamp, level, message, and any extra fields.
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: LOG_LEVEL || (NODE_ENV === "production" ? "info" : "debug"),
  format: NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
  ],
  // Do not crash the process when a log write fails
  exitOnError: false,
});

module.exports = logger;
