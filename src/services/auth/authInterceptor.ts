import { getAccessToken } from './authUtils';
const apiKey = import.meta.env.VITE_API_KEY;

// Attached exclusively to the dedicated `api` axios instance in src/services/api.ts
// (never to the global axios default, so JWTs and API keys can never leak to third-party URLs).
function authInterceptor(config: { headers: any }) {
    const token = getAccessToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (apiKey) {
        config.headers['x-api-key'] = apiKey;
    }

    return config;
}

export default authInterceptor;
