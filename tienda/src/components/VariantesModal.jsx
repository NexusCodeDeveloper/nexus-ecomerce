import { useState } from 'react';
import { formatearMoneda, variantesDisponibles } from '../utils/catalogo';

const etiquetaVariante = (variante) =>
  [variante.talle, variante.color].filter(Boolean).join(' / ') || 'Única';

const VariantesModal = ({ producto, onCerrar, onAgregar }) => {
  const opciones = variantesDisponibles(producto);
  const [seleccion, setSeleccion] = useState(opciones[0] || null);
  const [cantidad, setCantidad] = useState(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-6"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        className="w-full rounded-t-3xl bg-white p-5 sm:max-w-md sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-lg font-semibold text-slate-900">{producto.nombre}</p>
        <p className="text-sm text-slate-500">{formatearMoneda(producto.precio)}</p>

        <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">Elegí una opción</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {opciones.map((variante) => (
            <button
              key={etiquetaVariante(variante)}
              type="button"
              onClick={() => {
                setSeleccion(variante);
                setCantidad(1);
              }}
              className={`rounded-full border px-3 py-2 text-sm transition ${
                seleccion === variante
                  ? 'border-marca font-semibold text-marca'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {etiquetaVariante(variante)} ({variante.cantidad})
            </button>
          ))}
        </div>

        {seleccion && (
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-slate-500">Cantidad</span>
            <button
              type="button"
              onClick={() => setCantidad((actual) => Math.max(1, actual - 1))}
              className="h-8 w-8 rounded-full border border-slate-200 text-slate-600"
            >
              −
            </button>
            <span className="w-6 text-center font-semibold">{cantidad}</span>
            <button
              type="button"
              onClick={() => setCantidad((actual) => Math.min(seleccion.cantidad, actual + 1))}
              className="h-8 w-8 rounded-full border border-slate-200 text-slate-600"
            >
              +
            </button>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!seleccion}
            onClick={() => onAgregar(seleccion, cantidad)}
            className="flex-1 rounded-full bg-marca py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariantesModal;
