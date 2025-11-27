import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Add Telegram MiniApp auth header
api.interceptors.request.use((config) => {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData || "";

  if (initData) {
    config.headers.Authorization = `tma ${initData}`;
  }

  return config;
});

export default api;
