import { hexARgb } from './catalogo';

export const FUENTES_DISPONIBLES = [
  'Inter',
  'Poppins',
  'Roboto',
  'Montserrat',
  'Open Sans',
  'Lato',
  'Nunito',
  'Roboto Slab',
];

export const fuenteSegura = (tipografia) => {
  const nombre = String(tipografia || '').trim();
  return FUENTES_DISPONIBLES.includes(nombre) ? nombre : 'Inter';
};

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

export const estiloTema = (tema = {}) => ({
  '--tienda-primario': hexARgb(tema?.colorPrimario),
  '--tienda-secundario': hexARgb(tema?.colorSecundario),
  fontFamily: `'${fuenteSegura(tema?.tipografia)}', system-ui, sans-serif`,
});

export const cargarFuente = (tipografia) => {
  if (typeof document === 'undefined') return;
  const fuente = fuenteSegura(tipografia);
  if (fuente === 'Inter') return;

  const id = `fuente-${fuente.toLowerCase().replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;

  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fuente).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
};
