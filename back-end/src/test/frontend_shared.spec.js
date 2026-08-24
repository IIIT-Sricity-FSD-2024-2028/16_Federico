'use strict';

describe('Frontend Shared Utilities', () => {
  beforeAll(() => {
    global.window = global;
    require('../../../front-end/shared/formatters');
    require('../../../front-end/shared/sanitizer');
    require('../../../front-end/shared/insurance');
  });

  describe('Formatters', () => {
    it('escapes html properly', () => {
      expect(window.Formatters.escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
    });

    it('formats Indian currency', () => {
      expect(window.Formatters.formatCurrency(5000)).toMatch(/Rs\s*5,000/);
    });

    it('formats age correctly from date of birth', () => {
      const today = new Date();
      const thirtyYearsAgo = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
      expect(window.Formatters.formatAge(thirtyYearsAgo.toISOString())).toBe('30');
    });
  });

  describe('Sanitizer', () => {
    it('sanitizes patient fields from records', () => {
      const record = {
        patient_id: 10,
        name: 'Patient Test',
        ledger_id: 801,
        billing_link: 'http://test',
      };
      const sanitized = window.Sanitizer.forRole(record, 'PATIENT');
      expect(sanitized.patient_id).toBe(10);
      expect(sanitized.name).toBe('Patient Test');
      expect(sanitized.ledger_id).toBeUndefined();
      expect(sanitized.billing_link).toBeUndefined();
    });
  });

  describe('Insurance Calculator', () => {
    it('computes patient share and coverage correctly', () => {
      const policy = {
        coverage_limit: 10000,
        copay_percentage: 20,
      };
      const res = window.InsuranceCalc.computePatientShare(5000, policy, ['General Consultation']);
      expect(res.isValid).toBe(true);
      expect(res.coveredAmount).toBe(4000); // 80% of 5000
      expect(res.patientShare).toBe(1000); // 20% of 5000
    });
  });
});
