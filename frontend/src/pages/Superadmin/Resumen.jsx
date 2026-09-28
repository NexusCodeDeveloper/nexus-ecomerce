import { useApi } from '../../hooks/useApi';
import { obtenerResumen } from '../../api/superadmin';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Tarjeta = ({ titulo, valor, detalle, color = 'text-ios-label' }) => (
  <div className="rounded-ios-alert border border-ios-separator/40 bg-ios-surface p-5 shadow-ios-card">
    <p className="text-xs uppercase tracking-wide text-ios-tertiary mb-1">{titulo}</p>
    <p className={`text-3xl font-semibold ${color}`}>{valor}</p>
    {detalle && <p className="text-xs text-ios-secondary mt-1">{detalle}</p>}
  </div>
);

const Resumen = () => {
  const { data, loading, error } = useApi(
    async () => (await obtenerResumen()).data,
    { mensajeError: 'No se pudo cargar el resumen' }
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

  const resumen = data || {};
  const cupo = resumen.cupo || 0;
  const usados = resumen.total || 0;
  const porcentaje = cupo > 0 ? Math.min(100, Math.round((usados / cupo) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ios-label">Resumen de la plataforma</h1>
        <p className="text-sm text-ios-secondary mt-1">
          Estado de las tiendas, pruebas y vencimientos próximos.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tarjeta titulo="Tiendas" valor={usados} detalle={`Cupo: ${usados} de ${cupo}`} />
        <Tarjeta titulo="En prueba" valor={resumen.trial || 0} color="text-ios-orange" />
        <Tarjeta titulo="Activas" valor={resumen.activas || 0} color="text-ios-green" />
        <Tarjeta titulo="Pausadas" valor={resumen.pausadas || 0} color="text-ios-red" />
      </div>

      <div className="rounded-ios-alert border border-ios-separator/40 bg-ios-surface p-5 shadow-ios-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-ios-label">Cupo de tiendas</p>
          <p className="text-sm text-ios-secondary">{usados} / {cupo}</p>
        </div>
        <div className="h-2 rounded-full bg-ios-surface3 overflow-hidden">
          <div
            className={`h-full rounded-full ${porcentaje >= 90 ? 'bg-ios-red' : 'bg-ios-tint'}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="text-xs text-ios-secondary mt-2">
          Vencen en los próximos 7 días: <span className="text-ios-orange font-semibold">{resumen.porVencer || 0}</span>
        </p>
      </div>
    </div>
  );
};

export default Resumen;
