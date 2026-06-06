import { useCallback, useState } from "react";

export function useToast() {
  const [message, setMessage] = useState(null);

  const toast = useCallback((nextMessage) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(null), 2600);
  }, []);

  function ToastView() {
    if (!message) return null;

    return (
      <div className="fixed right-5 top-5 z-50 rounded-2xl border border-white/10 bg-black/90 px-5 py-4 text-white shadow-2xl backdrop-blur">
        <strong className="block">{message.title}</strong>
        <span className="mt-1 block text-sm text-white/55">{message.description}</span>
      </div>
    );
  }

  return { toast, ToastView };
}
