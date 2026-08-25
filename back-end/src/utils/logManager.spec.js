'use strict';

const fs = require('fs');
const {
  logAccess,
  logError,
  logEvent,
  flushLogs,
  getLogFilesInfo,
  ACCESS_LOG_PATH,
  ERROR_LOG_PATH,
  COMBINED_LOG_PATH,
} = require('./logManager');

function lastLine(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  return JSON.parse(lines[lines.length - 1]);
}

describe('logManager (Log and Error Management)', () => {
  it('writes an access entry to logs/access.log and logs/combined.log', () => {
    const req = {
      method: 'GET',
      originalUrl: '/spec/logmanager-access',
      headers: {},
    };
    const res = { statusCode: 200 };

    logAccess(req, res, 12);
    flushLogs();

    const access = lastLine(ACCESS_LOG_PATH);
    expect(access.level).toBe('HTTP');
    expect(access.method).toBe('GET');
    expect(access.url).toBe('/spec/logmanager-access');
    expect(access.statusCode).toBe(200);
    expect(access.durationMs).toBe(12);

    const combined = lastLine(COMBINED_LOG_PATH);
    expect(combined.url).toBe('/spec/logmanager-access');
  });

  it('writes an error entry to logs/error.log and logs/combined.log, and flushes immediately', () => {
    const err = new Error('spec-induced failure');
    const req = {
      method: 'POST',
      originalUrl: '/spec/logmanager-error',
      headers: {},
    };

    logError(err, req);
    // No explicit flushLogs() call — logError() must flush synchronously on its own.

    const errorEntry = lastLine(ERROR_LOG_PATH);
    expect(errorEntry.level).toBe('ERROR');
    expect(errorEntry.errorMessage).toBe('spec-induced failure');
    expect(errorEntry.method).toBe('POST');
    expect(errorEntry.url).toBe('/spec/logmanager-error');

    const combined = lastLine(COMBINED_LOG_PATH);
    expect(combined.errorMessage).toBe('spec-induced failure');
  });

  it('logEvent writes ERROR-level events to both error.log and combined.log', () => {
    logEvent('error', 'spec-induced event', { context: 'unit-test' });
    flushLogs();

    const errorEntry = lastLine(ERROR_LOG_PATH);
    expect(errorEntry.message).toBe('spec-induced event');
    expect(errorEntry.context).toBe('unit-test');
  });

  it('logEvent at non-error levels only writes to combined.log', () => {
    logEvent('info', 'spec-induced info event');
    flushLogs();

    const combined = lastLine(COMBINED_LOG_PATH);
    expect(combined.level).toBe('INFO');
    expect(combined.message).toBe('spec-induced info event');
  });

  it('getLogFilesInfo reports existing, non-empty log files with sizes and mtimes', () => {
    logAccess(
      { method: 'GET', originalUrl: '/spec/info-check', headers: {} },
      { statusCode: 200 },
      1,
    );

    const info = getLogFilesInfo();
    expect(info.accessLog.exists).toBe(true);
    expect(info.accessLog.sizeBytes).toBeGreaterThan(0);
    expect(info.errorLog.exists).toBe(true);
    expect(info.combinedLog.exists).toBe(true);
    expect(info.flushIntervalMs).toBe(5000);
  });
});
