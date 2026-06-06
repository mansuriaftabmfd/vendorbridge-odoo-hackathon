/**
 * Role Helper Utility
 * Single source of truth for role normalization across the entire backend.
 * Database stores roles as UPPERCASE (ADMIN, VENDOR, etc.)
 * Frontend uses lowercase_with_underscores (admin, vendor, etc.)
 */

const VALID_ROLES_UPPERCASE = ['ADMIN', 'MANAGER', 'PROCUREMENT_OFFICER', 'VENDOR'];
const VALID_ROLES_LOWERCASE = ['admin', 'manager', 'procurement_officer', 'vendor'];

/**
 * Normalize any role string to lowercase_with_underscores format.
 * "PROCUREMENT_OFFICER" → "procurement_officer"
 * "Procurement Officer" → "procurement_officer"
 * "procurementOfficer"  → "procurementofficer" (not handled, use explicit map)
 */
function normalizeRole(role) {
  if (!role) return '';
  return role.toString().trim().toUpperCase()
    // Map display labels to canonical forms first
    .replace(/^PROCUREMENT\s+OFFICER$/, 'PROCUREMENT_OFFICER')
    .replace(/^PROCUREMENT-OFFICER$/, 'PROCUREMENT_OFFICER')
    .toLowerCase();
}

/**
 * Convert frontend lowercase role → backend UPPERCASE role.
 * "procurement_officer" → "PROCUREMENT_OFFICER"
 */
function toBackendRole(frontendRole) {
  if (!frontendRole) return null;
  const normalized = normalizeRole(frontendRole);
  const map = {
    'procurement_officer': 'PROCUREMENT_OFFICER',
    'vendor': 'VENDOR',
    'manager': 'MANAGER',
    'admin': 'ADMIN',
  };
  return map[normalized] || frontendRole.toUpperCase();
}

/**
 * Convert backend UPPERCASE role → frontend lowercase role.
 * "PROCUREMENT_OFFICER" → "procurement_officer"
 */
function toFrontendRole(backendRole) {
  if (!backendRole) return '';
  return backendRole.toString().toLowerCase();
}

/**
 * Check if two roles are equivalent (regardless of casing format).
 */
function rolesMatch(roleA, roleB) {
  if (!roleA || !roleB) return false;
  return normalizeRole(roleA) === normalizeRole(roleB);
}

/**
 * Validate that a role string is one of the known valid roles.
 */
function isValidRole(role) {
  const n = normalizeRole(role);
  return VALID_ROLES_LOWERCASE.includes(n);
}

/**
 * Human-readable label for a role.
 */
function getRoleLabel(role) {
  const n = normalizeRole(role);
  const labels = {
    'admin': 'Administrator',
    'manager': 'Manager',
    'procurement_officer': 'Procurement Officer',
    'vendor': 'Vendor',
  };
  return labels[n] || role;
}

module.exports = {
  normalizeRole,
  toBackendRole,
  toFrontendRole,
  rolesMatch,
  isValidRole,
  getRoleLabel,
  VALID_ROLES_UPPERCASE,
  VALID_ROLES_LOWERCASE,
};
