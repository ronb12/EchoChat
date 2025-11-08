// Helper utility to get display name (alias preferred for privacy, falls back to real name or default)
// This ensures users can use aliases for safety while keeping real names in account

/**
 * Get display name for a user
 * Priority: alias > displayName > email username > 'User'
 * @param {Object} user - User object from auth or profile
 * @param {Object} profile - Optional profile object with alias
 * @returns {string} Display name to show in UI
 */
export function getDisplayName(user, profile = null) {
  if (!user) {return 'User';}

  // If profile has alias, use it for privacy
  if (profile?.alias) {
    return profile.alias;
  }

  // Fall back to displayName (real name from account)
  if (user.displayName) {
    return user.displayName;
  }

  // Fall back to email username
  if (user.email) {
    return user.email.split('@')[0];
  }

  return 'User';
}

/**
 * Get real name (for account/verification purposes)
 * @param {Object} user - User object
 * @param {Object} profile - Optional profile object
 * @returns {string} Real name
 */
export function getRealName(user, profile = null) {
  if (!user) {return null;}

  // Check profile for stored real name
  if (profile?.realName) {
    return profile.realName;
  }

  // Fall back to displayName (from account creation)
  return user.displayName || null;
}


