import api from './cliente';

export const obtenerTienda = (slug) => api.get(`/publico/${slug}`);

export const obtenerProductos = (slug, params = {}) => api.get(`/publico/${slug}/productos`, { params });

export const obtenerCategorias = (slug) => api.get(`/publico/${slug}/categorias`);

export const crearPedido = (slug, data) => api.post(`/publico/${slug}/pedidos`, data);
