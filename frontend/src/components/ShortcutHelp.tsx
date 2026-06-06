interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  description: string;
}

interface ShortcutHelpProps {
  shortcuts: Shortcut[];
  onClose: () => void;
}

export function ShortcutHelp({ shortcuts, onClose }: ShortcutHelpProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          快捷键
        </h2>
        <div className="space-y-3">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                {s.description}
              </span>
              <kbd className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-200">
                {s.ctrl && "Ctrl+"}
                {s.shift && "Shift+"}
                {s.key === "Enter" ? "Enter" : s.key === "/" ? "/" : s.key.toUpperCase()}
              </kbd>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
