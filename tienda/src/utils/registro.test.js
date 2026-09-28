import { describe, it, expect } from 'vitest';
import { normalizarSlug, esSlugValido } from './registro';

describe('utilidades de registro', () => {
  it('normaliza nombres a slug', () => {
    expect(normalizarSlug('Ropa & Estilo')).toBe('ropa-estilo');
    expect(normalizarSlug('Café Ñandú')).toBe('cafe-nandu');
    expect(normalizarSlug('  Hola   Mundo  ')).toBe('hola-mundo');
    expect(normalizarSlug('--bordes--')).toBe('bordes');
  });

  it('limita el slug a 40 caracteres', () => {
    expect(normalizarSlug('a'.repeat(80)).length).toBe(40);
  });

  it('valida slugs permitidos y rechaza invalidos', () => {
    expect(esSlugValido('mi-tienda')).toBe(true);
    expect(esSlugValido('tienda123')).toBe(true);
    expect(esSlugValido('ab')).toBe(false);
    expect(esSlugValido('mi tienda')).toBe(false);
    expect(esSlugValido('MAYUS')).toBe(false);
    expect(esSlugValido('-mal-')).toBe(false);
  });
});
