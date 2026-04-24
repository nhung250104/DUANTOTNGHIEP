import axios from "axios";
import useAuthStore from "./authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/",
});

// Gắn token vào mỗi request (nếu có) — giữ chỗ cho backend thật sau này
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;