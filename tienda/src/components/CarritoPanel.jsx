import { formatearMoneda } from '../utils/catalogo';
import { useCarrito } from '../context/carritoContexto';

const etiquetaVariante = (item) => [item.talle, item.color].filter(Boolean).join(' / ');

const CarritoPanel = ({ abierto, onCerrar, onFinalizar }) => {
  const { items, cambiarCantidad, quitar, total } = useCarrito();

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} role="presentation" />
      <aside className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <p className="font-semibold text-slate-900">Tu carrito</p>
          <button type="button" onClick={onCerrar} className="text-slate-400 hover:text-slate-600" aria-label="Cerrar carrito">
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 && <p className="text-sm text-slate-400">Todavía no agregaste productos.</p>}

          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.clave} className="flex gap-3 border-b border-slate-100 pb-4 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{item.nombre}</p>
                  {etiquetaVariante(item) && <p className="text-xs text-slate-400">{etiquetaVariante(item)}</p>}
                  <p className="text-sm text-slate-500">{formatearMoneda(item.precio)}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(item.clave, item.cantidad - 1)}
                      className="h-7 w-7 rounded-full border border-slate-200 text-slate-600"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">{item.cantidad}</span>
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(item.clave, item.cantidad + 1)}
                      className="h-7 w-7 rounded-full border border-slate-200 text-slate-600"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => quitar(item.clave)}
                      className="ml-2 text-xs text-red-500 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {formatearMoneda(item.precio * item.cantidad)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <footer className="border-t border-slate-100 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-lg font-bold text-slate-900">{formatearMoneda(total)}</span>
          </div>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={onFinalizar}
            className="w-full rounded-full bg-marca py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Finalizar compra
          </button>
        </footer>
      </aside>
    </div>
  );
};

export default CarritoPanel;
