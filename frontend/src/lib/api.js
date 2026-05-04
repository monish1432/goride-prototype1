import axios from 'axios';

export const api = axios.create({
    // Notice the /api at the very end! This is crucial.
    baseURL: "https://goride-backend-4bnx.onrender.com/api" 
});

export default api;
