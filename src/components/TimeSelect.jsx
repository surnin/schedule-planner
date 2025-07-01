import React from 'react';

const TimeSelect = ({ value, onChange, placeholder = "Выберите время", stepMinutes = 30 }) => {
  // Простой список с разумным количеством опций
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      const totalMinutes = hour * 60 + minute;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push({
        value: totalMinutes,
        label: timeString,
        hours: hour,
        minutes: minute
      });
    }
  }
  
  // Текущее значение
  let selectedValue = '';
  if (typeof value === 'object' && value.hours !== undefined) {
    selectedValue = value.hours * 60 + (value.minutes || 0);
  } else if (typeof value === 'number') {
    selectedValue = value * 60;
  }
  
  const handleChange = (e) => {
    const totalMinutes = parseInt(e.target.value);
    if (isNaN(totalMinutes)) return;
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    onChange({
      hours: hours,
      minutes: minutes,
      totalMinutes: totalMinutes,
      formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    });
  };
  
  return (
    <select 
      value={selectedValue} 
      onChange={handleChange}
      className="time-select-simple"
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