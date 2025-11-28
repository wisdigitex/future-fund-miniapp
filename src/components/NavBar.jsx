import { Link, useLocation } from "react-router-dom";
import {
  IoHomeOutline,
  IoHome,
  IoTimeOutline,
  IoTime,
  IoStatsChartOutline,
  IoStatsChart,
  IoEllipsisHorizontalOutline,
  IoEllipsisHorizontal,
} from "react-icons/io5";

const items = [
  {
    path: "/",
    label: "Dashboard",
    inactive: <IoHomeOutline size={22} />,
    active: <IoHome size={22} />,
  },
  {
    path: "/history",
    label: "History",
    inactive: <IoTimeOutline size={22} />,
    active: <IoTime size={22} />,
  },
  {
    path: "/stats",
    label: "Stats",
    inactive: <IoStatsChartOutline size={22} />,
    active: <IoStatsChart size={22} />,
  },
  {
    path: "/more",
    label: "More",
    inactive: <IoEllipsisHorizontalOutline size={22} />,
    active: <IoEllipsisHorizontal size={22} />,
  },
];

export default function NavBar() {
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const chatId = params.get("chatId");

  function buildPath(path) {
    return chatId ? `${path}?chatId=${chatId}` : path;
  }

  function isActive(path) {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const active = isActive(item.path);

        return (
          <Link
            key={item.path}
            to={buildPath(item.path)}
            className={active ? "nav-active" : ""}
          >
            <div className={`icon-circle ${active ? "icon-active" : ""}`}>
              {active ? item.active : item.inactive}
            </div>
            <span className={active ? "label-active" : ""}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
