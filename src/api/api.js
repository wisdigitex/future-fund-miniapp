import axios from "axios";
import useTelegram from "../hooks/useTelegram";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

API.interceptors.request.use((config) => {
const tg = window.Telegram?.WebApp;
const initData = tg?.initData || "";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

  // Telegram MiniApp authentication header
  if (initData) {
    config.headers.Authorization = `tma ${initData}`;
  }

  return config;
});

export default api;
