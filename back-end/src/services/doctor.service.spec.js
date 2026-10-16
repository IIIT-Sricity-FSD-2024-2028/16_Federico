'use strict';

const dataStore = require('../store/dataStore');
const doctorService = require('./doctor.service');

describe('services/doctor.service availability checks', () => {
  const testDoctorId = 987654;
  const testDate = '2099-01-02';
  const testAvailabilityId = 987654;

  afterEach(() => {
    dataStore.doctorAvailabilities = dataStore.doctorAvailabilities.filter(
      (slot) => slot.availability_id !== testAvailabilityId,
    );
  });

  it('does not block approval when no availability schedule exists for the date', () => {
    expect(
      doctorService.isDoctorAvailableAt(testDoctorId, '2099-01-01', '10:00'),
    ).toEqual({ available: true, message: null });
  });

  it('still enforces an explicitly configured available time slot', () => {
    dataStore.doctorAvailabilities.push({
      availability_id: testAvailabilityId,
      doctor_id: testDoctorId,
      available_date: testDate,
      start_time: '09:00:00',
      end_time: '12:00:00',
      status: 'Available',
    });

    expect(
      doctorService.isDoctorAvailableAt(testDoctorId, testDate, '13:00'),
    ).toEqual({
      available: false,
      message: doctorService.UNAVAILABLE_MESSAGE,
    });
  });

  it('does not approve a time explicitly marked unavailable', () => {
    dataStore.doctorAvailabilities.push({
      availability_id: testAvailabilityId,
      doctor_id: testDoctorId,
      available_date: testDate,
      start_time: '09:00:00',
      end_time: '12:00:00',
      status: 'UNAVAILABLE',
    });

    expect(
      doctorService.isDoctorAvailableAt(testDoctorId, testDate, '10:00'),
    ).toEqual({
      available: false,
      message: doctorService.UNAVAILABLE_MESSAGE,
    });
  });
});
