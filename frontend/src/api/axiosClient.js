// One shared axios instance. It attaches the JWT to every request automatically.
import axios from 'axios';

const axiosClient = axios.create({
  baseURL: '/api', // proxied to the backend by Vite (see vite.config.js)
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Helper to pull a readable message out of any API error
export function errorMessage(err) {
  return err.response?.data?.message || 'Something went wrong. Is the backend running?';
}

export default axiosClient;
