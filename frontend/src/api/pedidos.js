import api from './axios';

export const obtenerPedidos = (params = {}) => api.get('/pedidos', { params });

export const cambiarEstadoPedido = (id, estado) =>
  api.patch(`/pedidos/${id}/estado`, { estado });
