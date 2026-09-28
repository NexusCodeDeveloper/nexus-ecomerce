export const ESTADOS_TIENDA = [
  { valor: 'trial', etiqueta: 'Prueba' },
  { valor: 'activa', etiqueta: 'Activa' },
  { valor: 'pausada', etiqueta: 'Pausada' },
];

export const etiquetaEstado = (estado) =>
  ESTADOS_TIENDA.find((e) => e.valor === estado)?.etiqueta || estado || '—';

export const claseEstado = (estado) => {
  if (estado === 'activa') return 'text-ios-green';
  if (estado === 'trial') return 'text-ios-orange';
  if (estado === 'pausada') return 'text-ios-red';
  return 'text-ios-secondary';
};

export const formatearFecha = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleDateString('es-AR');
};

export const diasHasta = (valor) => {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return Math.ceil((fecha.getTime() - Date.now()) / 86400000);
};

export const textoVencimiento = (valor) => {
  const dias = diasHasta(valor);
  if (dias === null) return 'Sin vencimiento';
  if (dias < 0) return `Vencida hace ${Math.abs(dias)} día(s)`;
  if (dias === 0) return 'Vence hoy';
  return `Vence en ${dias} día(s)`;
};
