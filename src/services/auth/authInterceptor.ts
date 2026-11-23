const apiKey = import.meta.env.VITE_API_KEY;

// Attached exclusively to the dedicated `api` axios instance in src/services/api.ts
// (never to the global axios default, so API keys can never leak to third-party URLs).
// Session authentication is carried automatically by the HttpOnly `crixus_session` cookie
// via `withCredentials: true` (no JWTs are read from or stored in localStorage).
function authInterceptor(config: { headers: any }) {
    if (apiKey) {
        config.headers['x-api-key'] = apiKey;
    }

    return config;
}

export default authInterceptor;
