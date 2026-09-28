import axios from 'axios';
import { API_BASE_URL } from '../utils/apiBase';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const obtenerTienda = (slug) => api.get(`/publico/${slug}`);

export const obtenerProductos = (slug, params = {}) => api.get(`/publico/${slug}/productos`, { params });

export const obtenerCategorias = (slug) => api.get(`/publico/${slug}/categorias`);

export const crearPedido = (slug, data) => api.post(`/publico/${slug}/pedidos`, data);
