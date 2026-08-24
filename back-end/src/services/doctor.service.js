'use strict';

const { doctorRepository } = require('../repositories');
const { NotFoundError } = require('../errors');

// Doctors
function findAllDoctors(predicate = null) {
  return doctorRepository.findAll(predicate);
}

function findDoctorById(doctor_id) {
  return doctorRepository.findById(doctor_id);
}

function createDoctor(doctor) {
  return doctorRepository.create({
    name: doctor.name,
    specialization: doctor.specialization || 'General Practitioner',
    department: doctor.department || 'General',
    phone: doctor.phone || null,
    email: doctor.email || null,
    is_active: doctor.is_active !== undefined ? Boolean(doctor.is_active) : true,
    organization_id: doctor.organization_id ? Number(doctor.organization_id) : null,
    hospital_id: doctor.hospital_id ? Number(doctor.hospital_id) : null,
  });
}

function updateDoctor(doctor_id, patch) {
  return doctorRepository.update(doctor_id, patch);
}

function deleteDoctor(doctor_id) {
  const doctor = doctorRepository.findById(doctor_id);
  if (!doctor) {
    return { deleted: false };
  }
  // Soft-deletion to guard referential integrity with appointments
  doctorRepository.update(doctor_id, { is_active: false, status: 'INACTIVE' });
  const deleted = doctorRepository.delete(doctor_id);
  return { deleted };
}

// Doctor Availability
function findAllAvailabilities() {
  return doctorRepository.findAllAvailabilities();
}

function findAvailabilityByDoctor(doctor_id) {
  return doctorRepository.findAvailabilitiesByDoctor(doctor_id);
}

function createAvailability(availability) {
  const doctorId = Number(availability.doctor_id);
  const doctor = doctorRepository.findById(doctorId);
  if (!doctor) {
    throw new NotFoundError(`Doctor #${availability.doctor_id} not found`);
  }

  return doctorRepository.createAvailability({
    doctor_id: doctorId,
    available_date: availability.available_date,
    start_time: availability.start_time,
    end_time: availability.end_time,
    status: availability.status || 'AVAILABLE',
    organization_id: availability.organization_id || doctor.organization_id || null,
    hospital_id: availability.hospital_id || doctor.hospital_id || null,
  });
}

function deleteAvailability(availability_id) {
  const deleted = doctorRepository.deleteAvailability(availability_id);
  return { deleted };
}

module.exports = {
  findAllDoctors,
  findDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  findAllAvailabilities,
  findAvailabilityByDoctor,
  createAvailability,
  deleteAvailability,
};
