const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// http/https base for REST calls
export const API_URL = API_BASE;

// ws/wss base for WebSocket calls
export const WS_URL = API_BASE.replace(/^http/, 'ws');
