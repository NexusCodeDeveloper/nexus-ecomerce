import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAutenticacion } from '../../context/autenticacionContexto';

const enlaces = [
  { to: '/superadmin', texto: 'Resumen', end: true },
  { to: '/superadmin/tiendas', texto: 'Tiendas' },
];

const SuperadminLayout = () => {
  const { usuario, logout } = useAutenticacion();
  const navigate = useNavigate();

  const salir = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-ios-bg">
      <header className="sticky top-0 z-20 border-b border-ios-separator/40 bg-ios-surface/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center gap-4">
          <span className="font-semibold text-ios-label whitespace-nowrap">Nexus · Plataforma</span>
          <nav className="flex items-center gap-1">
            {enlaces.map((enlace) => (
              <NavLink
                key={enlace.to}
                to={enlace.to}
                end={enlace.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-ios-pill text-sm font-medium transition ${
                    isActive ? 'bg-ios-tint text-white' : 'text-ios-secondary hover:bg-ios-hover'
                  }`
                }
              >
                {enlace.texto}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:block text-xs text-ios-tertiary">{usuario?.email}</span>
            <button
              type="button"
              onClick={salir}
              className="px-3 py-1.5 rounded-ios-pill text-sm font-semibold text-ios-red hover:bg-ios-hover"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 animate-ios-page">
        <Outlet />
      </main>
    </div>
  );
};

export default SuperadminLayout;
