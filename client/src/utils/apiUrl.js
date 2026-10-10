/**
 * Where the API lives. Empty (the default) means the same address as the page, which is how it
 * works while developing (Vite forwards /api to the server). When the website and the API are
 * hosted separately, VITE_API_URL holds the API's address (for example
 * https://me-api.onrender.com) and is baked into the page when it is built.
 */
export function buildApiUrl(base, path) {
  const origin = typeof base === 'string' ? base.trim().replace(/\/+$/, '') : '';
  return `${origin}${path}`;
}

export const API_BASE_URL = buildApiUrl(import.meta.env.VITE_API_URL, '');

export const apiUrl = (path) => buildApiUrl(API_BASE_URL, path);
