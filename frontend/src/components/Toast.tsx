import { useEffect, useState } from "react";
import { subscribeToast } from "../utils/toast";

type ToastType = "success" | "error" | "warning";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToast((item) => {
      setItems((prev) => [...prev, item]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, 3000);
    });
    return unsubscribe;
  }, []);

  if (items.length === 0) return null;

  const colors: Record<ToastType, string> = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`${colors[item.type]} text-white px-4 py-2 rounded shadow-lg text-sm animate-fade-in`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
