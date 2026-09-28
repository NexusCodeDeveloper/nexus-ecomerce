import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { obtenerTiendas } from '../../api/superadmin';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { ESTADOS_TIENDA, etiquetaEstado, claseEstado, textoVencimiento, formatearFecha } from '../../utils/superadmin';

const filtros = [{ valor: '', etiqueta: 'Todas' }, ...ESTADOS_TIENDA];

const Tiendas = () => {
  const navigate = useNavigate();
  const [texto, setTexto] = useState('');
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setBuscar(texto.trim()), 350);
    return () => clearTimeout(timer);
  }, [texto]);

  const { data, loading, error } = useApi(
    async () => (await obtenerTiendas({ estado: estado || undefined, buscar: buscar || undefined })).data,
    { deps: [estado, buscar], mensajeError: 'No se pudieron cargar las tiendas' }
  );

  const tiendas = data || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ios-label">Tiendas</h1>
          <p className="text-sm text-ios-secondary mt-1">Clientes registrados en la plataforma.</p>
        </div>
        <input
          type="search"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          placeholder="Buscar por nombre, slug o email"
          className="w-full md:w-72 px-4 py-2 rounded-ios-control bg-ios-surface border border-ios-separator/40 text-sm text-ios-label placeholder:text-ios-tertiary focus:outline-none focus:border-ios-tint"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filtros.map((filtro) => (
          <button
            key={filtro.valor}
            type="button"
            onClick={() => setEstado(filtro.valor)}
            className={`px-3 py-1.5 rounded-ios-pill text-sm font-medium transition ${
              estado === filtro.valor ? 'bg-ios-tint text-white' : 'bg-ios-surface text-ios-secondary border border-ios-separator/40 hover:bg-ios-hover'
            }`}
          >
            {filtro.etiqueta}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner size="h-9 w-9" />
        </div>
      )}

      {!loading && error && <p className="text-ios-red text-sm">{error}</p>}

      {!loading && !error && tiendas.length === 0 && (
        <p className="text-ios-tertiary text-sm">No hay tiendas que coincidan con el filtro.</p>
      )}

      <div className="space-y-3">
        {tiendas.map((tienda) => (
          <button
            key={tienda._id}
            type="button"
            onClick={() => navigate(`/superadmin/tiendas/${tienda._id}`)}
            className="w-full text-left rounded-ios-alert border border-ios-separator/40 bg-ios-surface p-4 shadow-ios-card hover:bg-ios-hover transition"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-ios-label">{tienda.nombre}</span>
              <span className="text-xs text-ios-tertiary">/{tienda.slug}</span>
              <span className={`text-xs font-semibold ${claseEstado(tienda.estado)}`}>
                {etiquetaEstado(tienda.estado)}
              </span>
              <span className="ml-auto text-xs text-ios-secondary">{textoVencimiento(tienda.fechaVencimiento)}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-ios-secondary">
              <span>{tienda.email || 'Sin email'}</span>
              <span>Alta: {formatearFecha(tienda.fechaCreacion)}</span>
              <span>Modo: {tienda.modoVenta}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Tiendas;
