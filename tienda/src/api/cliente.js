import axios from 'axios';
import { API_BASE_URL } from '../utils/apiBase';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export default api;
