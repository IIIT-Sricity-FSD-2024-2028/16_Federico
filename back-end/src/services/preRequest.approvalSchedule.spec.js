'use strict';

const preRequestService = require('./preRequest.service');
const { getApprovalScheduleError } = preRequestService;

describe('PRE appointment approval schedule validation', () => {
  const now = new Date(2026, 10, 25, 15, 0, 0);

  it('blocks an appointment date before today', () => {
    expect(getApprovalScheduleError('2026-11-24', '02:00 PM', now)).toBe(
      'This appointment request is for a past date and cannot be approved.',
    );
  });

  it('blocks an appointment time that has passed today', () => {
    expect(getApprovalScheduleError('2026-11-25', '02:00 PM', now)).toBe(
      'This appointment time has already passed and cannot be approved.',
    );
  });

  it('allows a future appointment time today', () => {
    expect(getApprovalScheduleError('2026-11-25', '04:00 PM', now)).toBeNull();
  });

  it('allows an appointment on a future date', () => {
    expect(getApprovalScheduleError('2026-11-26', '09:00 AM', now)).toBeNull();
  });

  it('also blocks a past schedule if a request is created directly as approved', () => {
    expect(() =>
      preRequestService.create({
        status: 'APPROVED',
        requested_date: '2000-01-01',
        requested_time: '02:00 PM',
      }),
    ).toThrow('This appointment request is for a past date and cannot be approved.');
  });
});
