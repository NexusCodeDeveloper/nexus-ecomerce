import { describe, expect, it } from 'vitest';
import { MAX_IMAGEN_BYTES, validarImagen } from './imagenes';

describe('validarImagen', () => {
  it('rechaza cuando no hay archivo', () => {
    expect(validarImagen(null).ok).toBe(false);
  });

  it('rechaza formatos no permitidos', () => {
    const file = { type: 'image/gif', size: 1000 };
    expect(validarImagen(file)).toEqual({
      ok: false,
      mensaje: 'Solo se aceptan imágenes JPG, PNG o WebP',
    });
  });

  it('rechaza imágenes que superan el límite', () => {
    const file = { type: 'image/jpeg', size: MAX_IMAGEN_BYTES + 1 };
    expect(validarImagen(file)).toEqual({
      ok: false,
      mensaje: 'La imagen no puede superar los 4.5 MB',
    });
  });

  it('acepta imágenes válidas', () => {
    expect(validarImagen({ type: 'image/webp', size: 2000 })).toEqual({ ok: true, mensaje: '' });
  });
});
