type ToastType = "success" | "error" | "warning";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

let nextId = 0;
let listeners: ((t: ToastItem) => void)[] = [];

export function showToast(type: ToastType, message: string) {
  const item: ToastItem = { id: nextId++, type, message };
  listeners.forEach((fn) => fn(item));
}

export function subscribeToast(fn: (t: ToastItem) => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
