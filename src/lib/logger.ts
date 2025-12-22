/**
 * Logging Utility
 *
 * Centralized logging for the application. In development, logs to console.
 * In production, logs are suppressed or can be sent to external services.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('Something went wrong', { context: 'value' });
 *   logger.warn('Warning message');
 *   logger.info('Info message');
 *   logger.debug('Debug message');
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// In production, only log warnings and errors
const MIN_LOG_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Structured logger for the application
 */
export const logger = {
  /**
   * Debug level - development only, detailed debugging info
   */
  debug(message: string, context?: LogContext): void {
    if (shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.debug(formatMessage('debug', message, context));
    }
  },

  /**
   * Info level - general operational messages
   */
  info(message: string, context?: LogContext): void {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info(formatMessage('info', message, context));
    }
  },

  /**
   * Warn level - potential issues that don't break functionality
   */
  warn(message: string, context?: LogContext): void {
    if (shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(formatMessage('warn', message, context));
    }
  },

  /**
   * Error level - errors that need attention
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (shouldLog('error')) {
      const errorInfo = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { raw: error };

      const fullContext = { ...context, error: errorInfo };

      // eslint-disable-next-line no-console
      console.error(formatMessage('error', message, fullContext));

      // TODO: In production, send to error tracking service (e.g., Sentry)
      // if (process.env.NODE_ENV === 'production') {
      //   Sentry.captureException(error);
      // }
    }
  },
};

export default logger;
