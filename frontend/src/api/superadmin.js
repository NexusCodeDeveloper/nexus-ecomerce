import api from './axios';

export const obtenerResumen = () => api.get('/superadmin/resumen');

export const obtenerTiendas = (params = {}) => api.get('/superadmin/tiendas', { params });

export const obtenerTienda = (id) => api.get(`/superadmin/tiendas/${id}`);

export const cambiarEstadoTienda = (id, estado) =>
  api.patch(`/superadmin/tiendas/${id}/estado`, { estado });

export const registrarPagoTienda = (id, data) =>
  api.post(`/superadmin/tiendas/${id}/pagos`, data);
