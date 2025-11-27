import { createBrowserRouter } from "react-router-dom";
import App from "./App";

import Dashboard from "./screens/Dashboard";
import History from "./screens/History";
import Stats from "./screens/Stats";
import Deposit from "./screens/Deposit";
import Withdraw from "./screens/Withdraw";
import More from "./screens/More";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "history", element: <History /> },
      { path: "stats", element: <Stats /> },
      { path: "deposit", element: <Deposit /> },
      { path: "withdraw", element: <Withdraw /> },
      { path: "more", element: <More /> },
    ],
  },
]);
