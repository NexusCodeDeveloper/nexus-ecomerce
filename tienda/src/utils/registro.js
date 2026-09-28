export const normalizarSlug = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const esSlugValido = (slug) => {
  const valor = String(slug || '');
  return valor.length >= 3 && valor.length <= 40 && SLUG_REGEX.test(valor);
};
