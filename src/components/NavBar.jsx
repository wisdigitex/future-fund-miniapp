import { Link, useLocation } from "react-router-dom";

const items = [
  { path: "/", label: "Dashboard", icon: "▢" },
  { path: "/history", label: "History", icon: "⏱" },
  { path: "/stats", label: "Stats", icon: "📊" },
  { path: "/more", label: "More", icon: "⋯" },
];

export default function NavBar() {
  const { pathname, search } = useLocation();

  // Read chatId from query params
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
              {item.icon}
            </div>
            <span className={active ? "label-active" : ""}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
