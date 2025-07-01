import { useState, useEffect } from 'react';

export const useLocalStorage = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsedValue = JSON.parse(saved);
        // Для настроек нужно объединить с дефолтными значениями
        if (key === 'schedule-planner-settings') {
          const mergedValue = {
            ...defaultValue,
            ...parsedValue,
            // Убеждаемся что admins всегда существует
            admins: parsedValue.admins || []
          };
          return mergedValue;
        }
        return parsedValue;
      } catch (e) {
        // Handle localStorage error silently
      }
    }
    return defaultValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};