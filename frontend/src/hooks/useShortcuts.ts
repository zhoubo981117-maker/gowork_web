import { useEffect, useCallback, useState } from "react";

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
}

const SHORTCUTS: Omit<Shortcut, "action">[] = [
  { key: "n", description: "新建职位" },
  { key: "Enter", ctrl: true, description: "提交分析" },
  { key: "/", description: "搜索" },
  { key: "?", shift: true, description: "显示快捷键帮助" },
];

export function useShortcuts(handlers: Record<string, () => void>) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === "?" && e.shiftKey) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        handlers["?"]?.();
        return;
      }

      if (key === "n" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlers["n"]?.();
        return;
      }

      if (key === "enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlers["ctrl+enter"]?.();
        return;
      }

      if (key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlers["/"]?.();
        return;
      }

      if (key === "escape") {
        setShowHelp(false);
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp, shortcuts: SHORTCUTS };
}
