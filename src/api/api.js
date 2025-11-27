import axios from "axios";
import useTelegram from "../hooks/useTelegram";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

API.interceptors.request.use((config) => {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData;

  // If running outside Telegram → use Dev ChatID
  if (!initData && import.meta.env.VITE_DEV_CHAT_ID) {
    config.params = {
      ...(config.params || {}),
      chatId: import.meta.env.VITE_DEV_CHAT_ID,
    };
  }

  // Telegram MiniApp authentication header
  if (initData) {
    config.headers.Authorization = `tma ${initData}`;
  }

  return config;
});

export default API;
