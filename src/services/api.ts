import axios from 'axios';
import authInterceptor from './auth/authInterceptor';

const api = axios.create({
    baseURL: import.meta.env.VITE_BASE_URL,
    withCredentials: true,
});

api.interceptors.request.use(authInterceptor, (error) => Promise.reject(error));

export default api;
