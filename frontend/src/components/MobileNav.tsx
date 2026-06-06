import { NavLink } from "react-router-dom";
import { useTheme } from "../hooks/useTheme";

const NAV_ITEMS = [
  { to: "/board", label: "看板" },
  { to: "/analysis", label: "分析" },
  { to: "/interview", label: "面试" },
  { to: "/interview/history", label: "历史" },
  { to: "/scraper", label: "爬虫" },
  { to: "/settings", label: "设置" },
];

export default function MobileNav() {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const order: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const themeIcon = theme === "dark"
    ? "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    : theme === "light"
    ? "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    : "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z";

  return (
    <nav className="md:hidden flex items-center gap-1 bg-white dark:bg-gray-900 border-b dark:border-gray-700 px-4 py-2 overflow-x-auto">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `px-3 py-1.5 rounded text-sm whitespace-nowrap ${
              isActive
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                : "text-gray-600 dark:text-gray-300"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
      <button
        onClick={cycleTheme}
        className="ml-auto p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
        title="切换主题"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={themeIcon} />
        </svg>
      </button>
    </nav>
  );
}
