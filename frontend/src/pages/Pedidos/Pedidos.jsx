import { useMemo, useState } from 'react';
import { obtenerPedidos, cambiarEstadoPedido } from '../../api/pedidos';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useIosAlert } from '../../components/alerts';
import { obtenerMensajeErrorApi } from '../../utils/apiError';
import { useApi } from '../../hooks/useApi';
import { formatMoney, formatDateSafe } from '../../utils/format';

const ESTADOS = {
  pendiente: { etiqueta: 'Pendiente', clase: 'text-ios-orange' },
  confirmado: { etiqueta: 'Confirmado', clase: 'text-ios-tint' },
  enviado: { etiqueta: 'Enviado', clase: 'text-ios-purple' },
  entregado: { etiqueta: 'Entregado', clase: 'text-ios-green' },
  cancelado: { etiqueta: 'Cancelado', clase: 'text-ios-red' },
};

const FILTROS = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'confirmado', etiqueta: 'Confirmados' },
  { valor: 'enviado', etiqueta: 'Enviados' },
  { valor: 'entregado', etiqueta: 'Entregados' },
  { valor: 'cancelado', etiqueta: 'Cancelados' },
];

const accionesDe = (estado) => {
  if (estado === 'pendiente') {
    return [
      { estado: 'confirmado', texto: 'Confirmar', clase: 'bg-ios-tint/15 text-ios-tint' },
      { estado: 'cancelado', texto: 'Cancelar', clase: 'bg-ios-red/15 text-ios-red' },
    ];
  }
  if (estado === 'confirmado') {
    return [
      { estado: 'enviado', texto: 'Marcar enviado', clase: 'bg-ios-purple/15 text-ios-purple' },
      { estado: 'cancelado', texto: 'Cancelar', clase: 'bg-ios-red/15 text-ios-red' },
    ];
  }
  if (estado === 'enviado') {
    return [{ estado: 'entregado', texto: 'Marcar entregado', clase: 'bg-ios-green/15 text-ios-green' }];
  }
  return [];
};

const etiquetaVariante = (item) => [item.talle, item.color].filter(Boolean).join(' / ');

const Pedidos = () => {
  const { toast } = useIosAlert();
  const [filtro, setFiltro] = useState('');
  const [cambiando, setCambiando] = useState(null);

  const { data, loading, error, run } = useApi(
    async () => (await obtenerPedidos()).data,
    { mensajeError: 'No se pudieron cargar los pedidos' }
  );

  const visibles = useMemo(() => {
    const lista = data || [];
    return filtro ? lista.filter((pedido) => pedido.estado === filtro) : lista;
  }, [data, filtro]);

  const cambiar = async (pedido, estado) => {
    setCambiando(pedido._id);
    try {
      await cambiarEstadoPedido(pedido._id, estado);
      toast({ message: `Pedido #${pedido.numero} → ${ESTADOS[estado].etiqueta}` });
      await run();
    } catch (err) {
      toast({ message: obtenerMensajeErrorApi(err, 'No se pudo cambiar el estado'), type: 'error' });
    } finally {
      setCambiando(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ios-label">Pedidos online</h1>
        <p className="text-sm text-ios-secondary mt-1">
          Pedidos que llegan desde el catálogo. Coordiná el envío por WhatsApp y actualizá el estado.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => setFiltro(opcion.valor)}
            className={`px-3 py-1.5 rounded-ios-pill text-sm font-medium transition ${
              filtro === opcion.valor
                ? 'bg-ios-tint text-white'
                : 'bg-ios-surface text-ios-secondary border border-ios-separator/40 hover:bg-ios-hover'
            }`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner size="h-9 w-9" />
        </div>
      )}

      {!loading && error && <p className="text-ios-red text-sm">{error}</p>}

      {!loading && !error && visibles.length === 0 && (
        <p className="text-ios-tertiary text-sm">No hay pedidos que coincidan con el filtro.</p>
      )}

      <div className="space-y-3">
        {visibles.map((pedido) => {
          const estado = ESTADOS[pedido.estado] || { etiqueta: pedido.estado, clase: 'text-ios-secondary' };
          const acciones = accionesDe(pedido.estado);
          const telefono = String(pedido.cliente?.telefono || '').replace(/\D/g, '');

          return (
            <div
              key={pedido._id}
              className="rounded-ios-alert border border-ios-separator/40 bg-ios-surface p-4 shadow-ios-card"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-ios-label">Pedido #{pedido.numero}</span>
                <span className={`text-xs font-semibold ${estado.clase}`}>{estado.etiqueta}</span>
                <span className="text-xs text-ios-tertiary">{formatDateSafe(pedido.fechaCreacion)}</span>
                <span className="ml-auto font-semibold text-ios-label">{formatMoney(pedido.total)}</span>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ios-secondary">
                <span className="font-medium text-ios-label">{pedido.cliente?.nombre}</span>
                {pedido.cliente?.telefono && <span>{pedido.cliente.telefono}</span>}
                {pedido.cliente?.direccion && <span>{pedido.cliente.direccion}</span>}
              </div>

              {pedido.cliente?.nota && (
                <p className="mt-1 text-xs text-ios-tertiary">Nota: {pedido.cliente.nota}</p>
              )}

              <div className="mt-3 space-y-1 border-t border-ios-separator/30 pt-3">
                {(pedido.items || []).map((item, indice) => (
                  <div key={indice} className="flex justify-between text-sm text-ios-secondary">
                    <span>
                      {item.cantidad}x {item.nombre}
                      {etiquetaVariante(item) ? ` (${etiquetaVariante(item)})` : ''}
                    </span>
                    <span>{formatMoney(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {telefono && (
                  <a
                    href={`https://wa.me/${telefono}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-ios-pill bg-ios-green/15 text-ios-green text-sm font-semibold hover:bg-ios-green/25"
                  >
                    WhatsApp
                  </a>
                )}
                {acciones.map((accion) => (
                  <button
                    key={accion.estado}
                    type="button"
                    disabled={cambiando === pedido._id}
                    onClick={() => cambiar(pedido, accion.estado)}
                    className={`px-3 py-1.5 rounded-ios-pill text-sm font-semibold disabled:opacity-50 ${accion.clase}`}
                  >
                    {accion.texto}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Pedidos;
