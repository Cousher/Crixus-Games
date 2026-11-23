import { io, Socket } from "socket.io-client";

class SocketConnection {
    private static instance: Socket;

    private constructor() {
        // Private constructor to prevent instantiation from outside
    }

    public static getInstance(): Socket {
        if (!SocketConnection.instance) {
            SocketConnection.instance = io(import.meta.env.VITE_BASE_URL, {
                // Sends the HttpOnly `crixus_session` cookie automatically on every
                // handshake/reconnection without exposing tokens to JS / localStorage.
                withCredentials: true,
            });
        }

        return SocketConnection.instance;
    }
}

export default SocketConnection;
