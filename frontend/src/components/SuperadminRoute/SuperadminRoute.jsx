import { Navigate } from 'react-router-dom';
import { useAutenticacion } from '../../context/autenticacionContexto';

const SuperadminRoute = ({ children }) => {
  const { usuario, loading, esSuperadmin } = useAutenticacion();

  if (loading || !usuario) {
    return null;
  }

  if (!esSuperadmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default SuperadminRoute;
