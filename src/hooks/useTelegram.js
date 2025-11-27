// src/hooks/useTelegram.js

const useTelegram = () => {
  const tg = window.Telegram?.WebApp;

  return {
    tg,
    initData: tg?.initData || "",
    colorScheme: tg?.colorScheme || "dark",
    isTelegram: Boolean(tg)
  };
};

export default useTelegram;
