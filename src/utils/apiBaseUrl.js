export function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const isProduction = import.meta.env.PROD;

  const fallback = isProduction
    ? (typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://echodynamo.vercel.app')
    : 'http://localhost:3001';

  const baseUrl = envUrl && envUrl.length > 0 ? envUrl : fallback;

  return baseUrl.endsWith('/api') ? baseUrl.replace(/\/api$/, '') : baseUrl;
}

export function buildApiUrl(path = '') {
  const base = resolveApiBaseUrl();
  if (!path) {
    return base;
  }

  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalisedPath}`;
}
