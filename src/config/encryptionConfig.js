const flag =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  typeof import.meta.env.VITE_ENCRYPTION_ENABLED !== 'undefined'
    ? import.meta.env.VITE_ENCRYPTION_ENABLED
    : (typeof process !== 'undefined' && process.env.VITE_ENCRYPTION_ENABLED) || 'false';

export const encryptionConfig = {
  enabled: String(flag).toLowerCase() === 'true'
};

export default encryptionConfig;

