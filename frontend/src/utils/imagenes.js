export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGEN_BYTES = 4.5 * 1024 * 1024;

export const validarImagen = (file) => {
  if (!file) return { ok: false, mensaje: 'Seleccioná una imagen' };
  if (!TIPOS_IMAGEN.includes(file.type)) {
    return { ok: false, mensaje: 'Solo se aceptan imágenes JPG, PNG o WebP' };
  }
  if (file.size > MAX_IMAGEN_BYTES) {
    return { ok: false, mensaje: 'La imagen no puede superar los 4.5 MB' };
  }
  return { ok: true, mensaje: '' };
};
