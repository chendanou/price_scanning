import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Determine log directory
// Azure App Service: Use /home/LogFiles/Application (pre-existing writable location)
// Local development: Use logs directory in project root
const isAzure = process.env.WEBSITE_INSTANCE_ID || process.env.WEBSITE_SITE_NAME;
const logsDir = isAzure
  ? '/home/LogFiles/Application'
  : path.join(process.cwd(), 'logs');

// For local development, ensure logs directory exists
// For Azure, /home/LogFiles/Application already exists
if (!isAzure) {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (error) {
    console.warn('Could not create logs directory:', error);
  }
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
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
  })
];

// Add file transports only if logs directory exists and is writable
if (fs.existsSync(logsDir)) {
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
} else if (isAzure) {
  console.warn('Azure logs directory does not exist, using console only');
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
});
