import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// A missing/invalid/expired token is marked with code: 'AUTH_REQUIRED' by
// the server's auth middleware specifically — distinct from an otherwise
// normal 401 a controller returns on a valid, authenticated request (wrong
// login password, wrong current password when changing it). Without this,
// a stale token just silently failed on whatever page happened to use it,
// with the navbar still showing the user as "logged in."
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.code === 'AUTH_REQUIRED') {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
