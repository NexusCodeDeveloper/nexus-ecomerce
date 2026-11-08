import { describe, expect, it } from 'vitest';
import { estiloTema, hexARgb, redesConValor } from './tema';

describe('hexARgb', () => {
  it('convierte un hex válido a componentes rgb', () => {
    expect(hexARgb('#0A84FF')).toBe('10 132 255');
    expect(hexARgb('ffffff')).toBe('255 255 255');
  });

  it('usa el color por defecto si el hex es inválido', () => {
    expect(hexARgb('')).toBe('17 24 39');
    expect(hexARgb('#123')).toBe('17 24 39');
    expect(hexARgb('no-es-color')).toBe('17 24 39');
  });
});

describe('redesConValor', () => {
  it('omite redes vacías y normaliza la URL', () => {
    const redes = {
      instagram: 'instagram.com/mitienda',
      facebook: '',
      tiktok: 'https://tiktok.com/@mitienda',
    };
    expect(redesConValor(redes)).toEqual([
      { clave: 'instagram', nombre: 'Instagram', url: 'https://instagram.com/mitienda' },
      { clave: 'tiktok', nombre: 'TikTok', url: 'https://tiktok.com/@mitienda' },
    ]);
  });
});

describe('estiloTema', () => {
  it('devuelve variables CSS y tipografía', () => {
    const estilo = estiloTema({ colorPrimario: '#0A84FF', colorSecundario: '#FF9F0A', tipografia: 'Poppins' });
    expect(estilo['--tienda-primario']).toBe('10 132 255');
    expect(estilo['--tienda-secundario']).toBe('255 159 10');
    expect(estilo.fontFamily).toContain('Poppins');
  });
});
