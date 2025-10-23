const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf, colorize } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level}: ${message}`;
});

const logger = createLogger({
    level: "debug",
    format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
    transports: [
        // Log to file
        new transports.File({
            filename: `logs/app-${new Date().toISOString().split('T')[0]}.log`,
            level: "debug",
        }),

        // Log to console (optional, still helpful for you)
        new transports.Console({
            format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
        }),
    ],
});

module.exports = logger;
