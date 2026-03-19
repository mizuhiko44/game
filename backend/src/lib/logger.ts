import fs from "fs";
import path from "path";

const DEFAULT_LOG_DIR = path.resolve(process.cwd(), "logs");
const logDir = process.env.LOG_DIR ? path.resolve(process.cwd(), process.env.LOG_DIR) : DEFAULT_LOG_DIR;

fs.mkdirSync(logDir, { recursive: true });

const appLogPath = path.join(logDir, "app.log");
const errorLogPath = path.join(logDir, "error.log");

function timestamp() {
  return new Date().toISOString();
}

function write(filePath: string, line: string) {
  fs.appendFileSync(filePath, `${line}\n`, "utf8");
}

function format(level: string, message: string, meta?: unknown) {
  const serializedMeta = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
  return `[${timestamp()}] ${level.toUpperCase()} ${message}${serializedMeta}`;
}

export const logger = {
  info(message: string, meta?: unknown) {
    const line = format("info", message, meta);
    console.log(line);
    write(appLogPath, line);
  },
  warn(message: string, meta?: unknown) {
    const line = format("warn", message, meta);
    console.warn(line);
    write(appLogPath, line);
  },
  error(message: string, meta?: unknown) {
    const line = format("error", message, meta);
    console.error(line);
    write(appLogPath, line);
    write(errorLogPath, line);
  },
};
