import { describe, it, expect } from 'vitest';
import {
  formatearMoneda,
  hexARgb,
  disponibleDe,
  variantesDisponibles,
  claveItem,
  totalCarrito,
  cantidadCarrito,
  construirLinkWhatsApp,
} from './catalogo';

describe('utilidades del catalogo', () => {
  it('formatea montos en pesos', () => {
    expect(formatearMoneda(1500)).toContain('1.500');
    expect(formatearMoneda(null)).toBe('$0,00');
  });

  it('convierte colores hex a rgb con fallback', () => {
    expect(hexARgb('#FF9F0A')).toBe('255 159 10');
    expect(hexARgb('invalido')).toBe('17 24 39');
    expect(hexARgb(null)).toBe('17 24 39');
  });

  it('calcula el disponible segun variante', () => {
    const producto = { cantidad: 3, variantes: [{ talle: 'M', color: 'Rojo', cantidad: 2 }] };
    expect(disponibleDe(producto)).toBe(3);
    expect(disponibleDe(producto, 'M', 'Rojo')).toBe(2);
    expect(disponibleDe(producto, 'L', 'Rojo')).toBe(0);
  });

  it('lista solo variantes con stock', () => {
    const producto = {
      variantes: [
        { talle: 'M', color: 'Rojo', cantidad: 2 },
        { talle: 'L', color: 'Azul', cantidad: 0 },
      ],
    };
    expect(variantesDisponibles(producto)).toHaveLength(1);
    expect(variantesDisponibles(producto)[0].talle).toBe('M');
  });

  it('genera claves unicas por producto y variante', () => {
    expect(claveItem('abc', 'M', 'Rojo')).toBe('abc|M|Rojo');
    expect(claveItem('abc')).toBe('abc||');
  });

  it('suma totales y unidades del carrito', () => {
    const items = [
      { precio: 1500, cantidad: 2 },
      { precio: 500, cantidad: 1 },
    ];
    expect(totalCarrito(items)).toBe(3500);
    expect(cantidadCarrito(items)).toBe(3);
    expect(totalCarrito([])).toBe(0);
  });

  it('construye el link de WhatsApp y devuelve null sin numero', () => {
    expect(construirLinkWhatsApp('5491122334455', 'Hola')).toBe('https://wa.me/5491122334455?text=Hola');
    expect(construirLinkWhatsApp('54911-2233-4455', 'Hola')).toBe('https://wa.me/5491122334455?text=Hola');
    expect(construirLinkWhatsApp('', 'Hola')).toBe(null);
  });
});
