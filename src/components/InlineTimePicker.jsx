import React, { useState, useRef, useEffect } from 'react';

const InlineTimePicker = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  initialStart = { hours: 9, minutes: 0 },
  initialEnd = { hours: 18, minutes: 0 },
  position = { top: 0, left: 0 }
}) => {
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);
  const [activeField, setActiveField] = useState('start');
  const pickerRef = useRef(null);

  useEffect(() => {
    if (isOpen && pickerRef.current) {
      pickerRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setActiveField(activeField === 'start' ? 'end' : 'start');
    }
  };

  const handleConfirm = () => {
    if (startTime.hours !== null && endTime.hours !== null) {
      onConfirm(startTime, endTime);
      onClose();
    }
  };

  const adjustTime = (timeType, field, delta) => {
    const currentTime = timeType === 'start' ? startTime : endTime;
    const setTime = timeType === 'start' ? setStartTime : setEndTime;
    
    let newValue = currentTime[field] + delta;
    
    if (field === 'hours') {
      newValue = Math.max(0, Math.min(23, newValue));
    } else {
      newValue = Math.max(0, Math.min(59, newValue));
    }
    
    setTime(prev => ({ ...prev, [field]: newValue }));
  };

  const formatTime = (time) => {
    return `${time.hours.toString().padStart(2, '0')}:${time.minutes.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="inline-time-picker"
      ref={pickerRef}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1000
      }}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="time-picker-header">
        <span>Время смены</span>
        <button className="close-btn-small" onClick={onClose}>×</button>
      </div>
      
      <div className="time-picker-content">
        <div className={`time-field ${activeField === 'start' ? 'active' : ''}`}>
          <label>От:</label>
          <div className="time-input">
            <div className="time-display" onClick={() => setActiveField('start')}>
              {formatTime(startTime)}
            </div>
            <div className="time-controls">
              <button onClick={() => adjustTime('start', 'hours', 1)}>↑</button>
              <button onClick={() => adjustTime('start', 'hours', -1)}>↓</button>
              <button onClick={() => adjustTime('start', 'minutes', 15)}>↑</button>
              <button onClick={() => adjustTime('start', 'minutes', -15)}>↓</button>
            </div>
          </div>
        </div>
        
        <div className={`time-field ${activeField === 'end' ? 'active' : ''}`}>
          <label>До:</label>
          <div className="time-input">
            <div className="time-display" onClick={() => setActiveField('end')}>
              {formatTime(endTime)}
            </div>
            <div className="time-controls">
              <button onClick={() => adjustTime('end', 'hours', 1)}>↑</button>
              <button onClick={() => adjustTime('end', 'hours', -1)}>↓</button>
              <button onClick={() => adjustTime('end', 'minutes', 15)}>↑</button>
              <button onClick={() => adjustTime('end', 'minutes', -15)}>↓</button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="time-picker-actions">
        <button className="confirm-btn" onClick={handleConfirm}>
          ✓ Сохранить
        </button>
      </div>
    </div>
  );
};

export default InlineTimePicker;