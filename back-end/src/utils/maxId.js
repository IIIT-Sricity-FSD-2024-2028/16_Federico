'use strict';

/**
 * Safe replacement for `Math.max(...array.map(fn))`.
 *
 * `Math.max` uses the function call stack to accept variadic arguments.
 * When the array grows beyond ~100,000 items, spreading it as arguments
 * causes a "RangeError: Maximum call stack size exceeded" — an unhandled
 * exception that crashes the Node.js process entirely.
 *
 * This helper uses Array.reduce instead, which iterates the array in
 * constant stack space regardless of size. It also handles the empty-array
 * case (returns `fallback`, defaulting to 0) so callers can just do:
 *
 *   maxId(dataStore.admissions, 'admission_id') + 1
 *
 * instead of the old pattern:
 *
 *   dataStore.admissions.length > 0
 *     ? Math.max(...dataStore.admissions.map(a => a.admission_id)) + 1
 *     : 501
 */
function maxId(arr, field, baseOffset = 0) {
  if (!arr || arr.length === 0) return baseOffset > 0 ? baseOffset - 1 : 0;
  const max = arr.reduce((acc, item) => {
    const val = Number(item[field]) || 0;
    return val > acc ? val : acc;
  }, 0);
  return max > 0 ? max : (baseOffset > 0 ? baseOffset - 1 : 0);
}

function nextId(arr, field, startAt = 1) {
  if (!arr || arr.length === 0) return startAt;
  const max = arr.reduce((acc, item) => {
    const val = Number(item[field]) || 0;
    return val > acc ? val : acc;
  }, 0);
  return max >= startAt ? max + 1 : startAt;
}

module.exports = { maxId, nextId };
