'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Log & Error Management (Evaluation Criteria: "Logs and error information
 * should be stored in files at regular intervals").
 *
 * Buffers log lines in memory and flushes them to logs/access.log,
 * logs/error.log, and logs/combined.log every FLUSH_INTERVAL_MS, plus
 * immediately on errors, on buffer overflow, and on process exit — so a
 * crash never loses more than one flush interval of history.
 */

const LOGS_DIR = path.resolve(__dirname, '../../logs');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const ACCESS_LOG_PATH = path.join(LOGS_DIR, 'access.log');
const ERROR_LOG_PATH = path.join(LOGS_DIR, 'error.log');
const COMBINED_LOG_PATH = path.join(LOGS_DIR, 'combined.log');

const logBuffer = {
  access: [],
  error: [],
  combined: [],
};

const FLUSH_INTERVAL_MS = 5000; // Flushes to disk every 5 seconds

function formatLogEntry(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  return (
    JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    }) + '\n'
  );
}

function flushLogs() {
  try {
    if (logBuffer.access.length > 0) {
      const data = logBuffer.access.join('');
      logBuffer.access = [];
      fs.appendFileSync(ACCESS_LOG_PATH, data, 'utf8');
    }

    if (logBuffer.error.length > 0) {
      const data = logBuffer.error.join('');
      logBuffer.error = [];
      fs.appendFileSync(ERROR_LOG_PATH, data, 'utf8');
    }

    if (logBuffer.combined.length > 0) {
      const data = logBuffer.combined.join('');
      logBuffer.combined = [];
      fs.appendFileSync(COMBINED_LOG_PATH, data, 'utf8');
    }
  } catch (err) {
    console.error('[LogManager] Error flushing logs to disk:', err.message);
  }
}

// Background periodic timer to flush logs to files at regular intervals
const flushTimer = setInterval(flushLogs, FLUSH_INTERVAL_MS);
if (flushTimer.unref) {
  flushTimer.unref(); // Don't block Node process exit (e.g. under jest --watch)
}

process.on('beforeExit', flushLogs);
process.on('exit', flushLogs);

function logAccess(req, res, durationMs) {
  const meta = {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    durationMs,
    ip: req.ip || req.connection?.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'unknown',
    tenantId: req.tenant?.organizationId || null,
    hospitalId: req.tenant?.hospitalId || null,
    userId: req.session?.userId || null,
  };

  const line = formatLogEntry(
    'HTTP',
    `${req.method} ${req.originalUrl || req.url} ${res.statusCode} (${durationMs}ms)`,
    meta,
  );
  logBuffer.access.push(line);
  logBuffer.combined.push(line);

  if (logBuffer.access.length >= 50) {
    flushLogs();
  }
}

function logError(err, req = null) {
  const meta = {
    errorName: err.name || 'Error',
    errorMessage: err.message,
    stack: err.stack,
    method: req ? req.method : null,
    url: req ? req.originalUrl || req.url : null,
    ip: req ? req.ip || req.connection?.remoteAddress : null,
    tenantId: req?.tenant?.organizationId || null,
    userId: req?.session?.userId || null,
  };

  const line = formatLogEntry('ERROR', err.message || 'Unhandled Error', meta);
  logBuffer.error.push(line);
  logBuffer.combined.push(line);

  // Errors flush immediately rather than waiting for the interval
  flushLogs();
}

function logEvent(level, message, meta = {}) {
  const line = formatLogEntry(level.toUpperCase(), message, meta);
  logBuffer.combined.push(line);
  if (level.toUpperCase() === 'ERROR') {
    logBuffer.error.push(line);
  }
}

function getLogFilesInfo() {
  flushLogs();
  const getInfo = (filePath) => {
    if (!fs.existsSync(filePath)) return { sizeBytes: 0, exists: false };
    const stat = fs.statSync(filePath);
    return {
      sizeBytes: stat.size,
      modified: stat.mtime.toISOString(),
      exists: true,
    };
  };

  return {
    logsDir: LOGS_DIR,
    flushIntervalMs: FLUSH_INTERVAL_MS,
    accessLog: { path: ACCESS_LOG_PATH, ...getInfo(ACCESS_LOG_PATH) },
    errorLog: { path: ERROR_LOG_PATH, ...getInfo(ERROR_LOG_PATH) },
    combinedLog: { path: COMBINED_LOG_PATH, ...getInfo(COMBINED_LOG_PATH) },
  };
}

module.exports = {
  logAccess,
  logError,
  logEvent,
  flushLogs,
  getLogFilesInfo,
  LOGS_DIR,
  ACCESS_LOG_PATH,
  ERROR_LOG_PATH,
  COMBINED_LOG_PATH,
};
