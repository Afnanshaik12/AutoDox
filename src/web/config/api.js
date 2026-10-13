/**
 * AutoDox AI - Web Client API Configuration
 *
 * In production:
 * - If VITE_API_URL is provided, uses it as the absolute backend base URL (e.g. https://autodox-backend.onrender.com).
 * - Otherwise defaults to '' (relative path), which seamlessly proxies via Vercel rewrites (vercel.json) or Vite dev server.
 */
export const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : '').trim().replace(/\/+$/, '');

export function apiUrl(path) {
  if (!path) return '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
}
