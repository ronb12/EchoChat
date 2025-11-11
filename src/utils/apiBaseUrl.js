function normaliseUrl(value) {
  return value.replace(/\/+$/, '');
}

export function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const isProduction = import.meta.env.PROD;

  const fallback = isProduction
    ? (typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://echodynamo.vercel.app')
    : 'http://localhost:3001';

  const rawBase = envUrl && envUrl.length > 0 ? envUrl : fallback;
  const baseWithoutTrailingSlash = normaliseUrl(rawBase);

  return baseWithoutTrailingSlash.endsWith('/api')
    ? baseWithoutTrailingSlash.slice(0, -4)
    : baseWithoutTrailingSlash;
}

export function resolveApiRoot() {
  return resolveApiBaseUrl();
}

export function resolveApiBaseUrlWithPrefix() {
  const host = resolveApiBaseUrl();
  return host.endsWith('/api') ? host : `${host}/api`;
}

export function buildApiUrl(path = '') {
  const base = resolveApiBaseUrlWithPrefix();
  if (!path) {
    return base;
  }

  const normalisedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalisedPath}`;
}
