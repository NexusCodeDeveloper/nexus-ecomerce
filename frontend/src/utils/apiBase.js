export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

export const CATALOGO_URL =
  import.meta.env.VITE_CATALOGO_URL || (import.meta.env.DEV ? 'http://localhost:5174' : '');

export const urlCatalogo = (slug) => `${CATALOGO_URL}/${slug}`.replace(/([^:]\/)\/+/g, '$1');
