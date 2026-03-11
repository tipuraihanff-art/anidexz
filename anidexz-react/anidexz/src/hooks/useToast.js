import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, dur = 2200) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, out: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, out: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 380);
    }, dur);
  }, []);

  return { toasts, toast };
}
