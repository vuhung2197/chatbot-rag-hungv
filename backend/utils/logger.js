/**
 * Centralized logging utility for the application
 * Provides different log levels and environment-aware logging
 */

const LOG_LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG',
};

const COLORS = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m',  // Yellow
    INFO: '\x1b[36m',  // Cyan
    DEBUG: '\x1b[90m', // Gray
    RESET: '\x1b[0m',
};

class Logger {
    constructor(context = 'App') {
        this.context = context;
        this.isProduction = process.env.NODE_ENV === 'production';
        this.logLevel = process.env.LOG_LEVEL || (this.isProduction ? 'INFO' : 'DEBUG');
    }

    /**
     * Format log message with timestamp and context
     */
    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const contextStr = this.context ? `[${this.context}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';

        return `${timestamp} ${level} ${contextStr} ${message} ${metaStr}`.trim();
    }

    /**
     * Check if log level should be logged
     */
    shouldLog(level) {
        const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);

        return messageLevelIndex <= currentLevelIndex;
    }

    /**
     * Log error messages
     */
    error(message, error = null, meta = {}) {
        if (!this.shouldLog(LOG_LEVELS.ERROR)) return;

        const formattedMessage = this.formatMessage('❌ ERROR', message, meta);

        if (this.isProduction) {
            // In production, log to structured format (can be sent to logging service)
            console.error(JSON.stringify({
                level: 'ERROR',
                context: this.context,
                message,
                error: error ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                    code: error.code,
                } : null,
                meta,
                timestamp: new Date().toISOString(),
            }));
        } else {
            // In development, use colored output
            console.error(`${COLORS.ERROR}${formattedMessage}${COLORS.RESET}`);
            if (error) {
                console.error(error);
            }
        }
    }

    /**
     * Log warning messages
     */
    warn(message, meta = {}) {
        if (!this.shouldLog(LOG_LEVELS.WARN)) return;

        const formattedMessage = this.formatMessage('⚠️ WARN', message, meta);

        if (this.isProduction) {
            console.warn(JSON.stringify({
                level: 'WARN',
                context: this.context,
                message,
                meta,
                timestamp: new Date().toISOString(),
            }));
        } else {
            console.warn(`${COLORS.WARN}${formattedMessage}${COLORS.RESET}`);
        }
    }

    /**
     * Log info messages
     */
    info(message, meta = {}) {
        if (!this.shouldLog(LOG_LEVELS.INFO)) return;

        const formattedMessage = this.formatMessage('ℹ️ INFO', message, meta);

        if (this.isProduction) {
            console.info(JSON.stringify({
                level: 'INFO',
                context: this.context,
                message,
                meta,
                timestamp: new Date().toISOString(),
            }));
        } else {
            console.info(`${COLORS.INFO}${formattedMessage}${COLORS.RESET}`);
        }
    }

    /**
     * Log debug messages (only in development)
     */
    debug(message, meta = {}) {
        if (!this.shouldLog(LOG_LEVELS.DEBUG)) return;

        const formattedMessage = this.formatMessage('🐛 DEBUG', message, meta);

        if (!this.isProduction) {
            console.debug(`${COLORS.DEBUG}${formattedMessage}${COLORS.RESET}`);
        }
    }

    /**
     * Create a child logger with additional context
     */
    child(childContext) {
        return new Logger(`${this.context}:${childContext}`);
    }
}

// Export singleton instance and class
export const logger = new Logger('Backend');
export default Logger;
