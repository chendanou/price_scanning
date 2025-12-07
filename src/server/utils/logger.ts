import winston from 'winston';
import { config } from '../config';
import path from 'path';
import fs from 'fs';

// Use Azure-compatible log directory or fallback to local
const logsDir = process.env.WEBSITE_INSTANCE_ID
  ? '/home/LogFiles/Application' // Azure App Service writable location
  : path.dirname(config.logging.file);

// Ensure logs directory exists
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.warn('Could not create logs directory, logging to console only:', error);
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

const transports: winston.transport[] = [
  // Always log to console
  new winston.transports.Console({
    format: config.nodeEnv === 'production' ? logFormat : consoleFormat,
  })
];

// Add file transports only if logs directory is writable
try {
  fs.accessSync(logsDir, fs.constants.W_OK);
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
} catch (error) {
  console.warn('File logging disabled - directory not writable');
}

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
});
