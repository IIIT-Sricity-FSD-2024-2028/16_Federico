/**
 * shared/insurance.js
 * Computes patient financial share after insurance deduction.
 */
(function (root, factory) {
  'use strict';
  var exported = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = exported;
  }
  if (root) {
    root.InsuranceCalc = exported;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  /**
   * Computes patient share and covered amount for a given bill and policy.
   * @param {number} grossTotal - Total bill before insurance
   * @param {object|null} insurancePolicy - Policy details
   * @param {string[]} serviceNames - Services being charged
   * @returns {{ grossTotal: number, coveredAmount: number, patientShare: number, isValid: boolean, breakdown: string }}
   */
  function computePatientShare(grossTotal, insurancePolicy, serviceNames) {
    const gross = Number(grossTotal) || 0;
    const services = Array.isArray(serviceNames) ? serviceNames : [];

    // No policy or zero coverage limit → patient pays everything
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
      excludedServices.some(
        (ex) => (ex || '').toLowerCase() === (s || '').toLowerCase(),
      ),
    );

    const copayFraction = copayPct / 100;
    const insurancePays = Math.min(coverageLimit, gross * (1 - copayFraction));
    const coveredAmount = Math.round(insurancePays);
    const patientShare = Math.max(0, gross - coveredAmount);

    const fmt = (n) => Number(n).toLocaleString('en-IN');
    const exclusionNote = hasExcluded ? ' (some services may not be covered)' : '';
    const breakdown = `Coverage: Rs ${fmt(coveredAmount)} | Your Share: Rs ${fmt(patientShare)}${exclusionNote}`;

    return {
      grossTotal: gross,
      coveredAmount: coveredAmount,
      patientShare: patientShare,
      isValid: true,
      breakdown: breakdown,
    };
  }

  return Object.freeze({
    computePatientShare: computePatientShare,
  });
});
