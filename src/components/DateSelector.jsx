import React from 'react';

const DateSelector = ({ selectedDay, onDaySelect, dayLabels }) => {
  return (
    <div className="date-selector">
      <div className="date-selector-header">Выберите дату:</div>
      <div className="date-header-row">
        {dayLabels.map((label, index) => {
          const dayOfWeek = (index % 7);
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
          
          return (
            <div
              key={index}
              className={`date-header ${selectedDay === index ? 'active' : ''} ${
                isWeekend ? 'weekend' : ''
              }`}
              onClick={() => onDaySelect(index)}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DateSelector;