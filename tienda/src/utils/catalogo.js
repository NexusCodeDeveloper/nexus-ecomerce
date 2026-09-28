export const formatearMoneda = (valor) =>
  `$${Number(valor || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

export const hexARgb = (hex) => {
  const limpio = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(limpio)) return '17 24 39';
  return [
    parseInt(limpio.slice(0, 2), 16),
    parseInt(limpio.slice(2, 4), 16),
    parseInt(limpio.slice(4, 6), 16),
  ].join(' ');
};

export const disponibleDe = (producto, talle = '', color = '') => {
  if (producto?.variantes?.length > 0) {
    const variante = producto.variantes.find(
      (v) => String(v.talle || '') === String(talle || '') && String(v.color || '') === String(color || '')
    );
    return variante?.cantidad || 0;
  }
  return producto?.cantidad || 0;
};

export const variantesDisponibles = (producto) =>
  (producto?.variantes || []).filter((v) => (v.cantidad || 0) > 0);

export const claveItem = (productoId, talle = '', color = '') => `${productoId}|${talle}|${color}`;

export const totalCarrito = (items) =>
  Math.round((items || []).reduce((suma, item) => suma + (item.precio || 0) * (item.cantidad || 0), 0) * 100) / 100;

export const cantidadCarrito = (items) =>
  (items || []).reduce((suma, item) => suma + (item.cantidad || 0), 0);

export const construirLinkWhatsApp = (whatsapp, texto) => {
  const numero = String(whatsapp || '').replace(/\D/g, '');
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
};
