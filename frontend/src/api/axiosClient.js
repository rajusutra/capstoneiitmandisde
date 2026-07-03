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

// 402 = "Payment Required": the trial ended or the org was deactivated.
// Send the user to the Billing page so they can pay (or see why they're blocked).
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 402 && window.location.pathname !== '/billing') {
      window.location.href = '/billing';
    }
    return Promise.reject(error);
  }
);

// Helper to pull a readable message out of any API error
export function errorMessage(err) {
  return err.response?.data?.message || 'Something went wrong. Is the backend running?';
}

export default axiosClient;
