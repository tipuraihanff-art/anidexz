import { useState, useRef, useCallback } from 'react';

export function useProgressBar() {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  const start = useCallback(() => {
    setVisible(true);
    setWidth(0);
    let w = 0;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      w += Math.random() * 15;
      if (w > 82) w = 82;
      setWidth(w);
    }, 180);
  }, []);

  const done = useCallback(() => {
    clearInterval(timer.current);
    setWidth(100);
    setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 480);
  }, []);

  return { width, visible, start, done };
}
