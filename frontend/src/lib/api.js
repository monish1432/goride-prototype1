import axios from 'axios';

export const api = axios.create({
    baseURL: "https://goride-backend-4bnx.onrender.com"
});
