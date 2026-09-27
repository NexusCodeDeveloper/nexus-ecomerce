export const SLUG_RESERVADOS = [
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'cdn',
  'login',
  'mail',
  'panel',
  'public',
  'registro',
  'soporte',
  'static',
  'tienda',
  'www',
];

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const normalizarSlug = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

export const esSlugValido = (slug) =>
  typeof slug === 'string' && SLUG_REGEX.test(slug) && !SLUG_RESERVADOS.includes(slug);
