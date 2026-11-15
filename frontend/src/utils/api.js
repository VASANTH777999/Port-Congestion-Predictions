// Aiqon API Configuration Helper
// Automatically detects environment:
// - Vercel / Cloud: Uses relative path '' so requests go to the same origin /api
// - Local Vite Dev (localhost:5173): Uses http://localhost:8000 or Vite proxy
// - Explicit Override: Uses VITE_API_URL if configured in environment

export const API_BASE = import.meta.env.VITE_API_URL !== undefined
  ? import.meta.env.VITE_API_URL
  : (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173'
      ? 'http://localhost:8000'
      : '');

/**
 * Returns a fully qualified or relative URL for any API endpoint.
 * E.g. apiUrl('/api/ports') -> 'http://localhost:8000/api/ports' in local dev,
 * or '/api/ports' on Vercel deployment.
 */
export function apiUrl(endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE}${cleanEndpoint}`;
}

