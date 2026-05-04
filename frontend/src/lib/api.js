import axios from 'axios';

const api = axios.create({
    baseURL: "https://goride-backend-4bnx.onrender.com"
});

export { api };
export default api;
