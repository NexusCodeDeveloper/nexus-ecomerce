export const COLORES_PREDEFINIDOS = [
  '#0A84FF', '#FF9F0A', '#FF453A', '#FF9500', '#AF52DE', '#00C7BE',
  '#32D74B', '#FF2D55', '#5E5CE6', '#007AFF', '#8E8E93', '#111827',
];

export const FUENTES_DISPONIBLES = [
  { valor: 'Inter', etiqueta: 'Inter' },
  { valor: 'Poppins', etiqueta: 'Poppins' },
  { valor: 'Roboto', etiqueta: 'Roboto' },
  { valor: 'Montserrat', etiqueta: 'Montserrat' },
  { valor: 'Open Sans', etiqueta: 'Open Sans' },
  { valor: 'Lato', etiqueta: 'Lato' },
  { valor: 'Nunito', etiqueta: 'Nunito' },
  { valor: 'Roboto Slab', etiqueta: 'Roboto Slab' },
];

export const REDES_DISPONIBLES = [
  { clave: 'instagram', etiqueta: 'Instagram', placeholder: 'https://instagram.com/tutienda' },
  { clave: 'facebook', etiqueta: 'Facebook', placeholder: 'https://facebook.com/tutienda' },
  { clave: 'tiktok', etiqueta: 'TikTok', placeholder: 'https://tiktok.com/@tutienda' },
];

const NOMBRE_REDES = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
};

const normalizarUrl = (url) => {
  const valor = String(url || '').trim();
  if (!valor) return '';
  return /^https?:\/\//i.test(valor) ? valor : `https://${valor}`;
};

export const redesConValor = (redes = {}) =>
  Object.entries(NOMBRE_REDES)
    .map(([clave, nombre]) => ({ clave, nombre, url: normalizarUrl(redes?.[clave]) }))
    .filter((red) => red.url);

export const hexARgb = (hex) => {
  const limpio = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(limpio)) return '17 24 39';
  return [
    parseInt(limpio.slice(0, 2), 16),
    parseInt(limpio.slice(2, 4), 16),
    parseInt(limpio.slice(4, 6), 16),
  ].join(' ');
};

export const estiloTema = (tema = {}) => ({
  '--tienda-primario': hexARgb(tema?.colorPrimario),
  '--tienda-secundario': hexARgb(tema?.colorSecundario),
  fontFamily: `'${tema?.tipografia || 'Inter'}', system-ui, sans-serif`,
});
