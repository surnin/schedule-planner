import { useState, useEffect } from 'react';

export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(`Error loading ${key} from localStorage:`, e);
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};