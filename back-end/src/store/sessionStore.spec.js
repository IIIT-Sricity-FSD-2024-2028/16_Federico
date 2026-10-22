'use strict';

const { createSession, getSession, destroySession, SESSION_TTL_MS } = require('./sessionStore');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

describe('store/sessionStore expiry', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('persists an absolute 24-hour expiry and rejects the session after it', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const token = createSession({ userId: 44, role: 'ADMIN', organizationId: 1, hospitalId: 1 });
    const session = getSession(token);
    expect(new Date(session.expiresAt).getTime() - new Date(session.createdAt).getTime()).toBe(SESSION_TTL_MS);
    jest.advanceTimersByTime(SESSION_TTL_MS + 1);
    expect(getSession(token)).toBeNull();
    expect(destroySession(token)).toBe(false);
  });

  it('restores a persisted session after restart and rejects it if it expired while stopped', () => {
    const sessionFile = path.join(os.tmpdir(), `federico-sessions-${process.pid}-${Date.now()}.json`);
    const modulePath = JSON.stringify(path.resolve(__dirname, 'sessionStore.js'));
    const env = { ...process.env, SESSION_STORE_PATH: sessionFile };
    try {
      const token = execFileSync(process.execPath, ['-e', `const s=require(${modulePath});process.stdout.write(s.createSession({userId:7,role:'ADMIN',organizationId:1}));`], { env, encoding: 'utf8' });
      const restored = execFileSync(process.execPath, ['-e', `const s=require(${modulePath});const v=s.getSession(process.argv[1]);process.stdout.write(v?JSON.stringify(v):'null');`, token], { env, encoding: 'utf8' });
      expect(JSON.parse(restored).userId).toBe(7);

      const stored = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      stored[0][1].expiresAt = new Date(Date.now() - 1000).toISOString();
      fs.writeFileSync(sessionFile, JSON.stringify(stored), 'utf8');
      const expired = execFileSync(process.execPath, ['-e', `const s=require(${modulePath});const v=s.getSession(process.argv[1]);process.stdout.write(v?JSON.stringify(v):'null');`, token], { env, encoding: 'utf8' });
      expect(expired).toBe('null');
      expect(JSON.parse(fs.readFileSync(sessionFile, 'utf8'))).toEqual([]);
    } finally {
      if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
    }
  });
});
