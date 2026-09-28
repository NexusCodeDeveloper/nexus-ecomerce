import { describe, it, expect } from 'vitest';
import { etiquetaEstado, claseEstado, formatearFecha, diasHasta, textoVencimiento } from './superadmin';

describe('utilidades del panel superadmin', () => {
  it('traduce los estados de tienda', () => {
    expect(etiquetaEstado('trial')).toBe('Prueba');
    expect(etiquetaEstado('activa')).toBe('Activa');
    expect(etiquetaEstado('pausada')).toBe('Pausada');
    expect(etiquetaEstado('otro')).toBe('otro');
    expect(etiquetaEstado(null)).toBe('—');
  });

  it('asigna clases de color por estado', () => {
    expect(claseEstado('activa')).toContain('green');
    expect(claseEstado('trial')).toContain('orange');
    expect(claseEstado('pausada')).toContain('red');
    expect(claseEstado('otro')).toContain('secondary');
  });

  it('formatea fechas vacias o invalidas', () => {
    expect(formatearFecha(null)).toBe('—');
    expect(formatearFecha('no-es-fecha')).toBe('—');
    expect(formatearFecha('2026-01-15T00:00:00.000Z')).not.toBe('—');
  });

  it('calcula los dias hasta el vencimiento', () => {
    const enDiez = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(diasHasta(enDiez)).toBe(10);
    expect(diasHasta(null)).toBe(null);
  });

  it('describe el vencimiento en texto', () => {
    const haceDos = new Date(Date.now() - 2 * 86400000).toISOString();
    const enCinco = new Date(Date.now() + 5 * 86400000).toISOString();
    expect(textoVencimiento(null)).toBe('Sin vencimiento');
    expect(textoVencimiento(haceDos)).toMatch(/Vencida hace/);
    expect(textoVencimiento(enCinco)).toMatch(/Vence en/);
  });
});
