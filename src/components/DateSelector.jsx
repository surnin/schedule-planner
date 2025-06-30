import React from 'react';
import { dayLabels } from '../constants/defaultData';

const DateSelector = ({ selectedDay, onDaySelect }) => {
  return (
    <div className="date-selector">
      <div className="date-selector-header">Выберите дату:</div>
      <div className="date-options">
        {dayLabels.map((label, index) => (
          <button
            key={index}
            className={`date-option ${selectedDay === index ? 'active' : ''} ${
              index === 5 || index === 6 || index === 12 || index === 13 ? 'weekend' : ''
            } ${index === 8 ? 'today' : ''}`}
            onClick={() => onDaySelect(index)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DateSelector;