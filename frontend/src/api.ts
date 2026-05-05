import axios from 'axios';

const defaultBaseUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:5500/api' 
  : `http://${window.location.hostname}:5500/api`;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
});

api.interceptors.request.use((config) => {
  const user = localStorage.getItem('user');
  if (user) {
    const { token } = JSON.parse(user);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
