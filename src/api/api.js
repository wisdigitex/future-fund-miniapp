import axios from "axios";

const API_BASE = "https://futurefund-api-production.up.railway.app";

const tg = window.Telegram?.WebApp;
const initData = tg?.initData || "";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add Telegram authorization only when running inside Telegram
api.interceptors.request.use((config) => {
  if (initData) {
    config.headers.Authorization = `tma ${initData}`;
  }
  return config;
});

export default api;
