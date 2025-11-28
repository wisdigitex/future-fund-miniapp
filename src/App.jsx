import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import useTelegram from "./hooks/useTelegram";   // ✅ fixed path
import NavBar from "./components/NavBar";


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
