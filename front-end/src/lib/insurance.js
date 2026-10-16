'use strict';

/**
 * Ported verbatim from shared/insurance.js, including the exact `breakdown`
 * string the Patient portal renders.
 */
export function computePatientShare(grossTotal, insurancePolicy, serviceNames) {
  const gross = Number(grossTotal) || 0;
  const services = Array.isArray(serviceNames) ? serviceNames : [];

  if (
    !insurancePolicy ||
    typeof insurancePolicy !== 'object' ||
    !Number(insurancePolicy.coverage_limit)
  ) {
    return {
      grossTotal: gross,
      coveredAmount: 0,
      patientShare: gross,
      isValid: false,
      breakdown: 'No insurance coverage applied',
    };
  }

  const coverageLimit = Number(insurancePolicy.coverage_limit) || 0;
  const copayPct = Math.min(100, Math.max(0, Number(insurancePolicy.copay_percentage) || 0));
  const excludedServices = Array.isArray(insurancePolicy.excluded_services)
    ? insurancePolicy.excluded_services
    : [];

  const hasExcluded = services.some((s) =>
    excludedServices.some((ex) => (ex || '').toLowerCase() === (s || '').toLowerCase()),
  );

  const copayFraction = copayPct / 100;
  const insurancePays = Math.min(coverageLimit, gross * (1 - copayFraction));
  const coveredAmount = Math.round(insurancePays);
  const patientShare = Math.max(0, gross - coveredAmount);

  const fmt = (n) => Number(n).toLocaleString('en-IN');
  const exclusionNote = hasExcluded ? ' (some services may not be covered)' : '';
  const breakdown =
    'Coverage: Rs ' + fmt(coveredAmount) + ' | Your Share: Rs ' + fmt(patientShare) + exclusionNote;

  return { grossTotal: gross, coveredAmount, patientShare, isValid: true, breakdown };
}

