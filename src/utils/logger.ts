import winston from "winston"

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let logMessage = `${timestamp} [${level.toUpperCase()}] | ${message}`;
      if (Object.keys(meta).length > 0) {
        logMessage += ` | ${JSON.stringify(meta)}`;
      }
      return logMessage;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});

export default logger