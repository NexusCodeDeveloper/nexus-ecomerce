import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { crearPedido, obtenerTienda } from '../api/publico';
import { useCarrito } from '../context/carritoContexto';
import { formatearMoneda } from '../utils/catalogo';
import { cargarFuente, estiloTema } from '../utils/tema';

const formularioVacio = { nombre: '', telefono: '', email: '', direccion: '', nota: '' };

const Checkout = () => {
  const { slug } = useParams();
  const carrito = useCarrito();
  const [tienda, setTienda] = useState(null);
  const [form, setForm] = useState(formularioVacio);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [confirmado, setConfirmado] = useState(null);

  useEffect(() => {
    obtenerTienda(slug)
      .then((res) => setTienda(res.data))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    cargarFuente(tienda?.tema?.tipografia);
  }, [tienda?.tema?.tipografia]);

  const enviar = async (event) => {
    event.preventDefault();
    if (!form.nombre.trim() || !form.telefono.trim()) {
      setError('Completá tu nombre y teléfono para continuar');
      return;
    }

    setEnviando(true);
    setError('');
    try {
      const res = await crearPedido(slug, {
        cliente: {
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim(),
          email: form.email.trim(),
          direccion: form.direccion.trim(),
          nota: form.nota.trim(),
        },
        items: carrito.items.map((item) => ({
          producto: item.productoId,
          cantidad: item.cantidad,
          talle: item.talle,
          color: item.color,
        })),
        metodoPago: 'transferencia',
      });
      carrito.vaciar();
      setConfirmado(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos registrar el pedido. Intentá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (confirmado) {
    const { pedido, whatsapp } = confirmado;
    const pago = tienda?.pago || {};

    return (
      <div
        className="min-h-screen px-4 py-10"
        style={estiloTema(tienda?.tema)}
      >
        <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-center text-4xl">🎉</p>
          <h1 className="mt-2 text-center text-xl font-bold text-slate-900">¡Pedido registrado!</h1>
          <p className="mt-1 text-center text-sm text-slate-500">
            Pedido <span className="font-semibold">#{pedido.numero}</span> · {formatearMoneda(pedido.total)}
          </p>

          {(pago.alias || pago.cbu) && (
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-700">Datos para transferir</p>
              {pago.alias && <p className="text-slate-600">Alias: {pago.alias}</p>}
              {pago.cbu && <p className="text-slate-600">CBU: {pago.cbu}</p>}
              {pago.titular && <p className="text-slate-600">Titular: {pago.titular}</p>}
              {pago.banco && <p className="text-slate-600">Banco: {pago.banco}</p>}
            </div>
          )}

          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="mt-5 block w-full rounded-full bg-marca py-3 text-center text-sm font-semibold text-white"
            >
              Coordinar envío por WhatsApp
            </a>
          ) : (
            <p className="mt-5 text-center text-xs text-slate-400">
              La tienda no configuró un WhatsApp de contacto.
            </p>
          )}

          <Link
            to={`/${slug}`}
            className="mt-3 block w-full rounded-full border border-slate-200 py-3 text-center text-sm font-semibold text-slate-600"
          >
            Seguir comprando
          </Link>
        </div>
      </div>
    );
  }

  if (carrito.items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="text-slate-500">Tu carrito está vacío.</p>
        <Link
          to={`/${slug}`}
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={estiloTema(tienda?.tema)}
    >
      <div className="mx-auto max-w-2xl">
        <Link to={`/${slug}`} className="text-sm font-semibold text-marca">
          ← Volver al catálogo
        </Link>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Finalizar compra</h1>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">Resumen</p>
          <div className="mt-2 space-y-1">
            {carrito.items.map((item) => (
              <div key={item.clave} className="flex justify-between text-sm text-slate-600">
                <span>
                  {item.cantidad}x {item.nombre}
                  {[item.talle, item.color].filter(Boolean).length > 0
                    ? ` (${[item.talle, item.color].filter(Boolean).join(' / ')})`
                    : ''}
                </span>
                <span>{formatearMoneda(item.precio * item.cantidad)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 font-semibold text-slate-900">
            <span>Total</span>
            <span>{formatearMoneda(carrito.total)}</span>
          </div>
        </div>

        <form onSubmit={enviar} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">Tus datos</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-500">
              Nombre y apellido *
              <input
                type="text"
                value={form.nombre}
                onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-marca focus:outline-none"
              />
            </label>
            <label className="text-xs text-slate-500">
              Teléfono *
              <input
                type="tel"
                value={form.telefono}
                onChange={(event) => setForm({ ...form, telefono: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-marca focus:outline-none"
              />
            </label>
            <label className="text-xs text-slate-500">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-marca focus:outline-none"
              />
            </label>
            <label className="text-xs text-slate-500">
              Dirección (para coordinar el envío)
              <input
                type="text"
                value={form.direccion}
                onChange={(event) => setForm({ ...form, direccion: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-marca focus:outline-none"
              />
            </label>
          </div>
          <label className="mt-3 block text-xs text-slate-500">
            Nota para el vendedor
            <textarea
              value={form.nota}
              onChange={(event) => setForm({ ...form, nota: event.target.value })}
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-marca focus:outline-none"
            />
          </label>

          <p className="mt-4 text-xs text-slate-400">
            Pago por transferencia. Al confirmar te mostramos los datos y podés coordinar el envío por WhatsApp.
          </p>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="mt-4 w-full rounded-full bg-marca py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {enviando ? 'Registrando pedido…' : `Confirmar pedido · ${formatearMoneda(carrito.total)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
