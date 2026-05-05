import axios from 'axios';

const api = axios.create({
    baseURL: "https://goride-backend-4bnx.onrender.com/api"
});

// The magic security pass we accidentally deleted!
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token"); 
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export { api };
export default api;
