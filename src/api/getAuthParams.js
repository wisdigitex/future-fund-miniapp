import useTelegram from "../hooks/useTelegram";

export const getAuthParams = () => {
  const { isTelegram } = useTelegram();

  if (!isTelegram && import.meta.env.VITE_DEV_CHAT_ID) {
    return { chatId: import.meta.env.VITE_DEV_CHAT_ID };
  }

  return {}; // inside Telegram → no params needed
};
