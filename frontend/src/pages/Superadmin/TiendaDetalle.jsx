import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { obtenerTienda, cambiarEstadoTienda, registrarPagoTienda } from '../../api/superadmin';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useIosAlert } from '../../components/alerts';
import { obtenerMensajeErrorApi } from '../../utils/apiError';
import { etiquetaEstado, claseEstado, formatearFecha, textoVencimiento } from '../../utils/superadmin';

const pagoVacio = { monto: '', dias: 30, metodo: 'transferencia', nota: '' };

const Dato = ({ etiqueta, valor }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-ios-tertiary">{etiqueta}</p>
    <p className="text-sm text-ios-label mt-0.5">{valor || '—'}</p>
  </div>
);

const TiendaDetalle = () => {
  const { id } = useParams();
  const { toast } = useIosAlert();
  const [cambiando, setCambiando] = useState(false);
  const [guardandoPago, setGuardandoPago] = useState(false);
  const [form, setForm] = useState(pagoVacio);

  const { data, loading, error, run } = useApi(
    async () => (await obtenerTienda(id)).data,
    { deps: [id], mensajeError: 'No se pudo cargar la tienda' }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="h-9 w-9" />
      </div>
    );
  }

  if (error) {
    return <p className="text-ios-red text-sm">{error}</p>;
  }

  const { tienda, pagos = [] } = data || {};

  const cambiarEstado = async (estado) => {
    setCambiando(true);
    try {
      await cambiarEstadoTienda(id, estado);
      toast({ message: estado === 'activa' ? 'Tienda activada' : 'Tienda pausada', type: 'success' });
      await run();
    } catch (err) {
      toast({ message: obtenerMensajeErrorApi(err, 'No se pudo cambiar el estado'), type: 'error' });
    } finally {
      setCambiando(false);
    }
  };

  const enviarPago = async (event) => {
    event.preventDefault();
    const monto = Number(form.monto);
    if (!Number.isFinite(monto) || monto <= 0) {
      toast({ message: 'Ingresá un monto válido', type: 'error' });
      return;
    }

    setGuardandoPago(true);
    try {
      await registrarPagoTienda(id, {
        monto,
        dias: Number(form.dias) || 30,
        metodo: form.metodo,
        nota: form.nota.trim(),
      });
      toast({ message: 'Pago registrado y tienda activada', type: 'success' });
      setForm(pagoVacio);
      await run();
    } catch (err) {
      toast({ message: obtenerMensajeErrorApi(err, 'No se pudo registrar el pago'), type: 'error' });
    } finally {
      setGuardandoPago(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/superadmin/tiendas" className="inline-block text-sm text-ios-tint">
        ← Volver a tiendas
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-ios-label">{tienda?.nombre}</h1>
        <span className="text-sm text-ios-tertiary">/{tienda?.slug}</span>
        <span className={`text-sm font-semibold ${claseEstado(tienda?.estado)}`}>
          {etiquetaEstado(tienda?.estado)}
        </span>
        <div className="ml-auto flex gap-2">
          {tienda?.estado !== 'activa' && (
            <button
              type="button"
              disabled={cambiando}
              onClick={() => cambiarEstado('activa')}
              className="px-4 py-2 rounded-ios-pill bg-ios-green/15 text-ios-green text-sm font-semibold hover:bg-ios-green/25 disabled:opacity-50"
            >
              Activar
            </button>
          )}
          {tienda?.estado !== 'pausada' && (
            <button
              type="button"
              disabled={cambiando}
              onClick={() => cambiarEstado('pausada')}
              className="px-4 py-2 rounded-ios-pill bg-ios-red/15 text-ios-red text-sm font-semibold hover:bg-ios-red/25 disabled:opacity-50"
            >
              Pausar
            </button>
          )}
        </div>
      </div>

      <div className="rounded-ios-alert border border-ios-separator/40 bg-ios-surface p-5 shadow-ios-card grid grid-cols-2 md:grid-cols-4 gap-4">
        <Dato etiqueta="Email" valor={tienda?.email} />
        <Dato etiqueta="WhatsApp" valor={tienda?.whatsapp} />
        <Dato etiqueta="Teléfono" valor={tienda?.telefono} />
        <Dato etiqueta="País" valor={tienda?.pais} />
        <Dato etiqueta="Modo de venta" valor={tienda?.modoVenta} />
        <Dato etiqueta="Alta" valor={formatearFecha(tienda?.fechaInicio || tienda?.fechaCreacion)} />
        <Dato etiqueta="Vencimiento" valor={formatearFecha(tienda?.fechaVencimiento)} />
        <Dato etiqueta="Estado del período" valor={textoVencimiento(tienda?.fechaVencimiento)} />
      </div>

      <form
        onSubmit={enviarPago}
        className="rounded-ios-alert border border-ios-separator/40 bg-ios-surface p-5 shadow-ios-card space-y-4"
      >
        <p className="text-sm font-semibold text-ios-label">Registrar pago</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <label className="text-xs text-ios-secondary">
            Monto (ARS)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monto}
              onChange={(event) => setForm({ ...form, monto: event.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-ios-control bg-ios-surface2 border border-ios-separator/40 text-sm text-ios-label focus:outline-none focus:border-ios-tint"
            />
          </label>
          <label className="text-xs text-ios-secondary">
            Días
            <input
              type="number"
              min="1"
              max="365"
              value={form.dias}
              onChange={(event) => setForm({ ...form, dias: event.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-ios-control bg-ios-surface2 border border-ios-separator/40 text-sm text-ios-label focus:outline-none focus:border-ios-tint"
            />
          </label>
          <label className="text-xs text-ios-secondary">
            Método
            <select
              value={form.metodo}
              onChange={(event) => setForm({ ...form, metodo: event.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-ios-control bg-ios-surface2 border border-ios-separator/40 text-sm text-ios-label focus:outline-none focus:border-ios-tint"
            >
              <option value="transferencia">Transferencia</option>
              <option value="mercadopago">Mercado Pago</option>
              <option value="efectivo">Efectivo</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label className="text-xs text-ios-secondary">
            Nota
            <input
              type="text"
              value={form.nota}
              onChange={(event) => setForm({ ...form, nota: event.target.value })}
              className="mt-1 w-full px-3 py-2 rounded-ios-control bg-ios-surface2 border border-ios-separator/40 text-sm text-ios-label focus:outline-none focus:border-ios-tint"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={guardandoPago}
          className="px-4 py-2 rounded-ios-pill bg-ios-tint text-white text-sm font-semibold disabled:opacity-50"
        >
          {guardandoPago ? 'Guardando…' : 'Registrar pago y activar'}
        </button>
      </form>

      <div className="rounded-ios-alert border border-ios-separator/40 bg-ios-surface p-5 shadow-ios-card">
        <p className="text-sm font-semibold text-ios-label mb-3">Historial de pagos</p>
        {pagos.length === 0 && <p className="text-sm text-ios-tertiary">Todavía no hay pagos registrados.</p>}
        <div className="space-y-2">
          {pagos.map((pago) => (
            <div key={pago._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm border-b border-ios-separator/30 pb-2 last:border-0">
              <span className="font-semibold text-ios-label">
                ${Number(pago.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-ios-secondary">{pago.metodo}</span>
              <span className="text-ios-secondary">
                Hasta {formatearFecha(pago.periodoHasta)}
              </span>
              {pago.nota && <span className="text-ios-tertiary">{pago.nota}</span>}
              <span className="ml-auto text-xs text-ios-tertiary">{formatearFecha(pago.fechaCreacion)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TiendaDetalle;
