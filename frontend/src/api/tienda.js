import axios from 'axios';
import { API_BASE_URL } from '../utils/apiBase';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const obtenerMiTienda = () => api.get('/tienda');
export const actualizarMiTienda = (data) => api.patch('/tienda', data);
export const firmarSubidaCloudinary = () => api.post('/tienda/cloudinary/firma');