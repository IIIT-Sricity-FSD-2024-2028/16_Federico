'use strict';

const {
  helmetSecurity,
  globalRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  sanitizeInput,
  sanitizeValue,
} = require('./security');

describe('Security Middleware', () => {
  describe('exports', () => {
    it('exposes Helmet and rate limiter middleware as callable Express middleware', () => {
      expect(typeof helmetSecurity).toBe('function');
      expect(typeof globalRateLimiter).toBe('function');
      expect(typeof authRateLimiter).toBe('function');
      expect(typeof uploadRateLimiter).toBe('function');
    });
  });

  describe('sanitizeValue', () => {
    it('strips <script> tags from string values', () => {
      expect(sanitizeValue('<script>alert(1)</script>hello')).toBe('hello');
    });

    it('strips javascript: URLs', () => {
      expect(sanitizeValue('javascript:alert(1)')).toBe('alert(1)');
    });

    it('strips inline event handler attributes', () => {
      expect(sanitizeValue('onerror=alert(1) onload=alert(2)')).toBe(
        'alert(1) alert(2)',
      );
    });

    it('strips inline event handler attributes beyond onload/onerror', () => {
      expect(
        sanitizeValue('onclick=alert(1) onmouseover=alert(2) onfocus=alert(3)'),
      ).toBe('alert(1) alert(2) alert(3)');
    });

    it('recurses into arrays', () => {
      expect(sanitizeValue(['<script>bad</script>ok', 'fine'])).toEqual([
        'ok',
        'fine',
      ]);
    });

    it('recurses into nested objects', () => {
      const input = {
        name: '<script>x</script>Federico',
        nested: { bio: 'javascript:evil()' },
      };
      expect(sanitizeValue(input)).toEqual({
        name: 'Federico',
        nested: { bio: 'evil()' },
      });
    });

    it('leaves non-string primitives untouched', () => {
      expect(sanitizeValue(42)).toBe(42);
      expect(sanitizeValue(true)).toBe(true);
      expect(sanitizeValue(null)).toBe(null);
    });
  });

  describe('sanitizeInput middleware', () => {
    it('sanitizes req.body and req.query in place and calls next', () => {
      const req = {
        body: { comment: '<script>alert(1)</script>hi' },
        query: { search: 'javascript:evil()' },
      };
      const next = jest.fn();

      sanitizeInput(req, {}, next);

      expect(req.body.comment).toBe('hi');
      expect(req.query.search).toBe('evil()');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('tolerates a missing body/query without throwing', () => {
      const req = {};
      const next = jest.fn();
      expect(() => sanitizeInput(req, {}, next)).not.toThrow();
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
