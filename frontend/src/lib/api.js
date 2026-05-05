import axios from 'axios';

const api = axios.create({
    baseURL: "https://goride-backend-4bnx.onrender.com/api"
});

// This is the missing security guard! It attaches your login token.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token"); 
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export { api };
export default api;
