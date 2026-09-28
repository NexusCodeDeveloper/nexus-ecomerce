import { useState } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import Catalogo from './pages/Catalogo';
import Checkout from './pages/Checkout';
import Registro from './pages/Registro';
import { CarritoProvider } from './context/CarritoContext';

const TiendaLayout = () => {
  const { slug } = useParams();
  return (
    <CarritoProvider slug={slug}>
      <Outlet />
    </CarritoProvider>
  );
};

const Inicio = () => {
  const [slug, setSlug] = useState('');
  const navigate = useNavigate();

  const ir = (event) => {
    event.preventDefault();
    const limpio = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (limpio) navigate(`/${limpio}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={ir} className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-slate-900">Catálogos online</h1>
        <p className="mt-1 text-sm text-slate-500">Ingresá el nombre de la tienda para ver su catálogo.</p>
        <input
          type="text"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="nombre-de-la-tienda"
          className="mt-5 w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-center text-sm focus:border-slate-400 focus:outline-none"
        />
        <button
          type="submit"
          className="mt-3 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white"
        >
          Ver catálogo
        </button>
        <p className="mt-4 text-xs text-slate-400">
          ¿Querés vender online?{' '}
          <Link to="/registro" className="font-semibold text-slate-600">
            Creá tu tienda
          </Link>
        </p>
      </form>
    </div>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/:slug" element={<TiendaLayout />}>
        <Route index element={<Catalogo />} />
        <Route path="checkout" element={<Checkout />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
