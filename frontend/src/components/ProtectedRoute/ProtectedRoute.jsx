import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../../context/autenticacionContexto';

const ProtectedRoute = ({ children, soloAdmin, soloTienda }) => {
  const { usuario, loading, esAdmin, esSuperadmin } = useAutenticacion();

  if (loading || !usuario) {
    return null;
  }

  if (soloTienda && esSuperadmin) {
    return <Navigate to="/superadmin" replace />;
  }

  if (soloAdmin && !esAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
