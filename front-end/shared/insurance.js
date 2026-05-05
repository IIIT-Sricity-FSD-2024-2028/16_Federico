// shared/insurance.js
// Computes patient financial share after insurance deduction.
// Called by FA discharge screen and Patient billing screen.
// All inputs are passed as arguments — no localStorage access.

window.InsuranceCalc = (function () {

  /**
   * computePatientShare
   * @param {number} grossTotal - Total bill before insurance
   * @param {object|null} insurancePolicy - From state.patientProfiles[uhid].insurance
   *   Expected shape:
   *     {
   *       coverage_limit:      number,   // max amount insurance will pay (default: 0)
   *       copay_percentage:    number,   // % patient must pay out of pocket (default: 0)
   *       excluded_services:   string[]  // service names NOT covered (default: [])
   *     }
   * @param {string[]} serviceNames - Services being charged (default: [])
   * @returns {{
   *   grossTotal:    number,
   *   coveredAmount: number,
   *   patientShare:  number,
   *   isValid:       boolean,
   *   breakdown:     string
   * }}
   */
  function computePatientShare(grossTotal, insurancePolicy, serviceNames) {
    const gross = Number(grossTotal) || 0;
    const services = Array.isArray(serviceNames) ? serviceNames : [];

    // No policy or zero coverage limit → patient pays everything
    if (
      !insurancePolicy ||
      typeof insurancePolicy !== "object" ||
      !Number(insurancePolicy.coverage_limit)
    ) {
      return {
        grossTotal:    gross,
        coveredAmount: 0,
        patientShare:  gross,
        isValid:       false,
        breakdown:     "No insurance coverage applied"
      };
    }

    const coverageLimit    = Number(insurancePolicy.coverage_limit)    || 0;
    const copayPct         = Math.min(100, Math.max(0, Number(insurancePolicy.copay_percentage) || 0));
    const excludedServices = Array.isArray(insurancePolicy.excluded_services)
      ? insurancePolicy.excluded_services
      : [];

    // Flag excluded services but do not deduct from gross (no per-service pricing in Phase 4)
    const hasExcluded = services.some(
      (s) => excludedServices.some(
        (ex) => (ex || "").toLowerCase() === (s || "").toLowerCase()
      )
    );

    // copay fraction: patient pays this % → insurance pays (1 - fraction)
    const copayFraction  = copayPct / 100;
    const insurancePays  = Math.min(coverageLimit, gross * (1 - copayFraction));
    const coveredAmount  = Math.round(insurancePays);
    const patientShare   = Math.max(0, gross - coveredAmount);

    const fmt = (n) => Number(n).toLocaleString("en-IN");
    const exclusionNote  = hasExcluded ? " (some services may not be covered)" : "";
    const breakdown      = `Coverage: Rs ${fmt(coveredAmount)} | Your Share: Rs ${fmt(patientShare)}${exclusionNote}`;

    return {
      grossTotal:    gross,
      coveredAmount,
      patientShare,
      isValid:       true,
      breakdown
    };
  }

  return { computePatientShare };
})();
