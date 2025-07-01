import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCalendarDays } from '@fortawesome/free-solid-svg-icons';

const CalendarNavigation = ({ 
  currentStartDate, 
  viewPeriod, 
  onStartDateChange,
  dynamicDayLabels,
  positions,
  selectedPosition,
  onPositionChange
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateRangeRef = useRef(null);

  // Закрываем выпадающий список при клике вне элемента
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateRangeRef.current && !dateRangeRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navigateWeeks = (direction) => {
    const currentDate = new Date(currentStartDate);
    currentDate.setDate(currentDate.getDate() + direction);
    onStartDateChange(currentDate.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    onStartDateChange(monday.toISOString().split('T')[0]);
  };

  const formatDateRange = () => {
    const start = new Date(currentStartDate);
    const end = new Date(start);
    end.setDate(start.getDate() + viewPeriod - 1);
    
    const formatDate = (date) => {
      return date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    };
    
    return `${formatDate(start)} — ${formatDate(end)}`;
  };

  const handleDateRangeClick = () => {
    setShowDatePicker(!showDatePicker);
  };

  const handleDateSelect = (selectedDate) => {
    onStartDateChange(selectedDate);
    setShowDatePicker(false);
  };

  // Генерируем опции для выбора периода (ограничиваем 14 днями)
  const generateDateOptions = () => {
    const options = [];
    const today = new Date();
    
    // 7 дней назад от сегодня до 7 дней вперед (всего 14 дней)
    for (let i = -7; i <= 6; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString('ru-RU', { 
        weekday: 'short',
        day: 'numeric', 
        month: 'short' 
      });
      
      options.push({ value: dateStr, label, date });
    }
    
    return options;
  };

  return (
    <div className="calendar-navigation">
      <div className="calendar-nav-left">
        <button 
          className="nav-btn"
          onClick={() => navigateWeeks(-1)}
          title="Предыдущий день"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        
        <div className="date-range" ref={dateRangeRef} onClick={handleDateRangeClick}>
          <FontAwesomeIcon icon={faCalendarDays} className="calendar-icon" />
          <span className="date-text">{formatDateRange()}</span>
          {showDatePicker && (
            <div className="date-picker-dropdown">
              <div className="date-picker-header">Выберите начальную дату периода:</div>
              <div className="date-options">
                {generateDateOptions().map((option) => (
                  <button
                    key={option.value}
                    className={`date-option ${currentStartDate === option.value ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDateSelect(option.value);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <button 
          className="nav-btn"
          onClick={() => navigateWeeks(1)}
          title="Следующий день"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
      
      <div className="calendar-nav-right">
        <div className="position-filter">
          <select 
            value={selectedPosition} 
            onChange={(e) => onPositionChange(e.target.value)}
            className="position-select"
          >
            <option value="all">Все должности</option>
            {positions?.map(position => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </div>
        
        <button 
          className="today-btn"
          onClick={goToToday}
          title="Перейти к текущей неделе"
        >
          Сегодня
        </button>
      </div>
    </div>
  );
};

export default CalendarNavigation;