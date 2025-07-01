import React, { useState } from 'react';
import TimeSelect from './TimeSelect';

const FlexibleTimeModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  initialStart = { hours: 9, minutes: 0 },
  initialEnd = { hours: 18, minutes: 0 }
}) => {
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(initialEnd);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (startTime.hours !== null && endTime.hours !== null) {
      onConfirm(startTime, endTime);
      onClose();
    }
  };

  const formatTimeDisplay = (time) => {
    if (time.hours === null) return '';
    return `${time.hours.toString().padStart(2, '0')}:${(time.minutes || 0).toString().padStart(2, '0')}`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="flexible-time-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Время свободной смены</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-content">
          <div className="time-selection">
            <div className="time-field">
              <label>Начало смены:</label>
              <TimeSelect
                value={startTime}
                placeholder="Выберите время начала"
                onChange={setStartTime}
              />
              <span className="time-display">{formatTimeDisplay(startTime)}</span>
            </div>
            
            <div className="time-field">
              <label>Конец смены:</label>
              <TimeSelect
                value={endTime}
                placeholder="Выберите время окончания"
                onChange={setEndTime}
              />
              <span className="time-display">{formatTimeDisplay(endTime)}</span>
            </div>
          </div>
          
          <div className="time-duration">
            {startTime.hours !== null && endTime.hours !== null && (
              <div className="duration-info">
                Продолжительность: {Math.abs((endTime.hours * 60 + (endTime.minutes || 0)) - (startTime.hours * 60 + (startTime.minutes || 0)))} минут
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleConfirm}
            disabled={startTime.hours === null || endTime.hours === null}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlexibleTimeModal;