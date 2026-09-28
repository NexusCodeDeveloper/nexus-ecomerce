import api from './axios';

export const obtenerPedidos = (params = {}) => api.get('/superadmin/pedidos', { params });
export const cambiarEstadoPedido = (id, estado) =>
  api.patch(`/superadmin/pedidos/${id}/estado`, { estado });