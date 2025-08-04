// API configuration for different environments
export const API_CONFIG = {
    SERVER_URL: import.meta.env.VITE_SERVER_URL || 'http://localhost:3000',
    AI_BACKEND_URL: import.meta.env.VITE_AI_BACKEND_URL || 'http://localhost:5000',
};

export const createServerApiUrl = (endpoint: string) => {
    const baseUrl = API_CONFIG.SERVER_URL;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
};

export const createAIApiUrl = (endpoint: string) => {
    const baseUrl = API_CONFIG.AI_BACKEND_URL;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
};