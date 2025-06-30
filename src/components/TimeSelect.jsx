import React from 'react';
import { generateTimeOptions, timeToMinutes, minutesToTime, formatTime } from '../utils/timeUtils';

const TimeSelect = ({ value, onChange, placeholder = "Выберите время", stepMinutes = 10 }) => {
  const timeOptions = generateTimeOptions(stepMinutes);
  
  // Конвертируем значение в минуты для сравнения
  let selectedValue = '';
  if (typeof value === 'number') {
    selectedValue = value * 60; // если value в часах
  } else if (typeof value === 'object' && value.hours !== undefined) {
    selectedValue = timeToMinutes(value.hours, value.minutes || 0);
  }
  
  const handleChange = (e) => {
    const totalMinutes = parseInt(e.target.value);
    const time = minutesToTime(totalMinutes);
    
    // Возвращаем в формате, совместимом с текущей системой
    onChange({
      hours: time.hours,
      minutes: time.minutes,
      totalMinutes: totalMinutes,
      formatted: formatTime(time.hours, time.minutes)
    });
  };
  
  return (
    <select 
      value={selectedValue} 
      onChange={handleChange}
      className="time-select"
    >
      <option value="">{placeholder}</option>
      {timeOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default TimeSelect;