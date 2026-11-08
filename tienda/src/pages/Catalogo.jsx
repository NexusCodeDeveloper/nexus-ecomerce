import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { obtenerTienda, obtenerProductos, obtenerCategorias } from '../api/publico';
import { useCarrito } from '../context/carritoContexto';
import ProductoCard from '../components/ProductoCard';
import VariantesModal from '../components/VariantesModal';
import CarritoPanel from '../components/CarritoPanel';
import { construirLinkWhatsApp } from '../utils/catalogo';
import { cargarFuente, estiloTema, redesConValor } from '../utils/tema';

const Catalogo = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const carrito = useCarrito();
  const [tienda, setTienda] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [buscar, setBuscar] = useState('');
  const [categoria, setCategoria] = useState('');
  const [variantesDe, setVariantesDe] = useState(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      setCargando(true);
      setError('');
      try {
        const [resTienda, resProductos, resCategorias] = await Promise.all([
          obtenerTienda(slug),
          obtenerProductos(slug),
          obtenerCategorias(slug),
        ]);
        if (cancelado) return;
        setTienda(resTienda.data);
        setProductos(resProductos.data);
        setCategorias(resCategorias.data);
      } catch (err) {
        if (cancelado) return;
        const status = err.response?.status;
        if (status === 404) setError('No encontramos esta tienda. Revisá el link.');
        else if (status === 403) setError('Esta tienda está pausada por el momento.');
        else setError('No pudimos cargar el catálogo. Intentá de nuevo.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargar();
    return () => {
      cancelado = true;
    };
  }, [slug]);

  const filtrados = useMemo(() => {
    const termino = buscar.trim().toLowerCase();
    return productos.filter((producto) => {
      const coincideCategoria = !categoria || producto.categoria?.toLowerCase() === categoria.toLowerCase();
      const coincideBusqueda =
        !termino ||
        producto.nombre?.toLowerCase().includes(termino) ||
        producto.categoria?.toLowerCase().includes(termino);
      return coincideCategoria && coincideBusqueda;
    });
  }, [productos, buscar, categoria]);

  const pedirAgregar = (producto) => {
    if (producto.variantes?.length > 0) {
      setVariantesDe(producto);
      return;
    }
    carrito.agregar(producto, { cantidad: 1 });
    setCarritoAbierto(true);
  };

  const confirmarVariante = (variante, cantidad) => {
    carrito.agregar(variantesDe, {
      talle: variante.talle || '',
      color: variante.color || '',
      cantidad,
    });
    setVariantesDe(null);
    setCarritoAbierto(true);
  };

  const linkConsulta = tienda
    ? construirLinkWhatsApp(tienda.whatsapp, `¡Hola ${tienda.nombre}! Quiero hacer una consulta.`)
    : null;

  const redes = redesConValor(tienda?.tema?.redes);

  useEffect(() => {
    cargarFuente(tienda?.tema?.tipografia);
  }, [tienda?.tema?.tipografia]);

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Cargando catálogo…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-center text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={estiloTema(tienda?.tema)}
    >
      <header className="relative">
        <div className="h-40 w-full overflow-hidden bg-marca/90">
          {tienda?.tema?.banner && (
            <img src={tienda.tema.banner} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="h-1 w-full bg-secundario" />
        <div className="mx-auto -mt-10 max-w-5xl px-4">
          <div className="flex items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {tienda?.tema?.logo ? (
              <img
                src={tienda.tema.logo}
                alt={tienda.nombre}
                className="h-16 w-16 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-marca text-xl font-bold text-white">
                {tienda?.nombre?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-lg font-bold text-slate-900">{tienda?.nombre}</h1>
              <p className="text-xs text-slate-400">/{tienda?.slug}</p>
              {redes.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {redes.map((red) => (
                    <a
                      key={red.clave}
                      href={red.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:border-secundario hover:text-secundario"
                    >
                      {red.nombre}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {linkConsulta && (
                <a
                  href={linkConsulta}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300 sm:block"
                >
                  Consultar
                </a>
              )}
              <button
                type="button"
                onClick={() => setCarritoAbierto(true)}
                className="relative rounded-full bg-marca px-4 py-2 text-sm font-semibold text-white"
              >
                Carrito
                {carrito.cantidad > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                    {carrito.cantidad}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={buscar}
            onChange={(event) => setBuscar(event.target.value)}
            placeholder="Buscar productos"
            className="w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-marca focus:outline-none sm:max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoria('')}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                !categoria ? 'border-marca font-semibold text-marca' : 'border-slate-200 text-slate-500'
              }`}
            >
              Todas
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.nombre}
                type="button"
                onClick={() => setCategoria(cat.nombre)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  categoria.toLowerCase() === cat.nombre.toLowerCase()
                    ? 'border-marca font-semibold text-marca'
                    : 'border-slate-200 text-slate-500'
                }`}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>

        {filtrados.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-400">
            No hay productos que coincidan con la búsqueda.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtrados.map((producto) => (
              <ProductoCard key={producto._id} producto={producto} onAgregar={pedirAgregar} />
            ))}
          </div>
        )}
      </main>

      {variantesDe && (
        <VariantesModal
          producto={variantesDe}
          onCerrar={() => setVariantesDe(null)}
          onAgregar={confirmarVariante}
        />
      )}

      <CarritoPanel
        abierto={carritoAbierto}
        onCerrar={() => setCarritoAbierto(false)}
        onFinalizar={() => {
          setCarritoAbierto(false);
          navigate(`/${slug}/checkout`);
        }}
      />
    </div>
  );
};

export default Catalogo;
