export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

export const PANEL_URL =
  import.meta.env.VITE_PANEL_URL || (import.meta.env.DEV ? 'http://localhost:5173' : '/');
