/**
 * Formats a package value into LPA display format.
 * Handles both raw rupees (540000) and LPA values (5.4).
 *
 * @param {number} val - Package value (either in LPA or raw rupees)
 * @returns {string} Formatted string like "5.4 LPA" or "—"
 */
export function formatPackage(val) {
  if (!val || val <= 0) return '—'
  // If value >= 1000, assume it's in raw rupees → convert to LPA
  const lpa = val >= 1000 ? val / 100000 : val
  // Clean up trailing zeros: 5.0 → 5, 12.5 → 12.5
  const formatted = lpa % 1 === 0 ? lpa.toFixed(0) : lpa.toFixed(1)
  return `₹${formatted} LPA`
}

/**
 * Returns just the numeric LPA value for calculations.
 */
export function toLPA(val) {
  if (!val || val <= 0) return 0
  return val >= 1000 ? val / 100000 : val
}
