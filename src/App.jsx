import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import useTelegram from "./hooks/useTelegram";   // ✅ fixed path
import NavBar from "./components/NavBar";

// Save chatId from URL so SPA keeps it after navigation
const urlChatId = new URLSearchParams(window.location.search).get("chatId");

if (urlChatId) {
  sessionStorage.setItem("preview_chatId", urlChatId);
}


function App() {
  const { tg } = useTelegram();

  useEffect(() => {
    if (!tg) return;
    tg.ready();
    tg.expand();
  }, [tg]);

  return (
    <div className="app-root">
      <Outlet />
      <NavBar />
    </div>
  );
}

export default App;
