import { describe, expect, it } from 'vitest';
import { estiloTema, fuenteSegura, redesConValor } from './tema';

describe('fuenteSegura', () => {
  it('acepta fuentes de la lista y cae en Inter', () => {
    expect(fuenteSegura('Poppins')).toBe('Poppins');
    expect(fuenteSegura('Comic Sans')).toBe('Inter');
    expect(fuenteSegura()).toBe('Inter');
  });
});

describe('redesConValor', () => {
  it('normaliza URLs y descarta redes vacías', () => {
    expect(redesConValor({
      instagram: 'instagram.com/tienda',
      tiktok: 'https://tiktok.com/@tienda',
      facebook: '',
    })).toEqual([
      { clave: 'instagram', nombre: 'Instagram', url: 'https://instagram.com/tienda' },
      { clave: 'tiktok', nombre: 'TikTok', url: 'https://tiktok.com/@tienda' },
    ]);
  });
});

describe('estiloTema', () => {
  it('arma las variables CSS y la tipografía', () => {
    const estilo = estiloTema({ colorPrimario: '#0A84FF', colorSecundario: '#FF9F0A', tipografia: 'Lato' });
    expect(estilo['--tienda-primario']).toBe('10 132 255');
    expect(estilo['--tienda-secundario']).toBe('255 159 10');
    expect(estilo.fontFamily).toContain('Lato');
  });
});
