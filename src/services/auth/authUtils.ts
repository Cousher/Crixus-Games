// Sessions are stored in HttpOnly cookies set by the server (never in localStorage).
// These helpers only purge legacy localStorage tokens left over from earlier builds.

export function consumeLegacyAccessToken(): string | null {
    try {
        const legacy = localStorage.getItem('accessToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return legacy;
    } catch {
        return null;
    }
}

export function clearTokens() {
    try {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    } catch {
        // ignore storage errors in private contexts
    }
}
