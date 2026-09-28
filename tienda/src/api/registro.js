import api from './cliente';

export const consultarSlug = (slug) => api.get(`/tiendas/disponibilidad/${slug}`);

export const registrarTienda = (data) => api.post('/tiendas/registro', data);
