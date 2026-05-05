import axios from 'axios';

export const api = axios.create({
    baseURL: "https://goride-backend-4bnx.onrender.com/api"
});

// The Interceptor: Automatically grabs your token and attaches it as a Bearer Token
api.interceptors.request.use((config) => {
    // 1. Look in the browser's local storage for the token
    const token = localStorage.getItem("token"); 
    
    // 2. If it exists, glue it to the header
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;
