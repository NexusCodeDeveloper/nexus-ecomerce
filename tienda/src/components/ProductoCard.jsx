import { formatearMoneda } from '../utils/catalogo';

const ProductoCard = ({ producto, onAgregar }) => {
  const tieneVariantes = producto.variantes?.length > 0;
  const stock = tieneVariantes
    ? producto.variantes.reduce((suma, variante) => suma + (variante.catalogo || 0), 0)
    : producto.catalogo || 0;
  const sinStock = stock <= 0;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-36 items-center justify-center bg-slate-100 text-xs text-slate-300">
        Sin imagen
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">{producto.categoria}</p>
        <p className="font-semibold leading-snug text-slate-800">{producto.nombre}</p>
        <p className="text-lg font-bold text-slate-900">{formatearMoneda(producto.precio)}</p>
        <p className={`text-xs ${sinStock ? 'text-red-500' : 'text-emerald-600'}`}>
          {sinStock ? 'Sin stock' : `${stock} disponible(s)`}
        </p>
        <button
          type="button"
          disabled={sinStock}
          onClick={() => onAgregar(producto)}
          className="mt-auto w-full rounded-full bg-marca py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {tieneVariantes ? 'Elegir opción' : 'Agregar al carrito'}
        </button>
      </div>
    </div>
  );
};

export default ProductoCard;
