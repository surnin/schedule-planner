import React, { useState, useRef } from 'react';
import DateSelector from './DateSelector';

const TimelineView = ({ 
  employees, 
  schedule, 
  shiftTypes,
  selectedDay,
  cellTags,
  tags,
  dayLabels,
  getScheduleByDate,
  getCellTagsByDate,
  onBackToGrid,
  onDaySelect,
  onTagClick,
  shouldShowEmployee,
  getFlexibleShiftData,
  onFlexibleShiftUpdate,
  workingHours = { start: 8, startMinutes: 0, end: 22, endMinutes: 0 }
}) => {
  const getDayLabel = (dayIndex) => {
    return dayLabels[dayIndex] || '';
  };

  // Генерация временной шкалы с 30-минутными интервалами
  const generateTimeScale = () => {
    const startHour = workingHours.start + (workingHours.startMinutes || 0) / 60;
    const endHour = workingHours.end + (workingHours.endMinutes || 0) / 60;
    
    // Обработка времени через полночь (например, 22:00 - 06:00)
    let totalHours;
    if (endHour <= startHour) {
      // Время через полночь: добавляем 24 часа к концу
      totalHours = (24 - startHour) + endHour;
    } else {
      totalHours = endHour - startHour;
    }
    
    const intervalMinutes = 30; // Фиксированный интервал 30 минут
    const totalMinutes = totalHours * 60;
    const intervals = Math.ceil(totalMinutes / intervalMinutes);
    
    return Array.from({ length: intervals }, (_, index) => {
      const totalMinutesFromStart = index * intervalMinutes;
      let hour = Math.floor(startHour + totalMinutesFromStart / 60);
      let minute = Math.floor((startHour * 60 + totalMinutesFromStart) % 60);
      
      // Нормализация часов (обработка перехода через полночь)
      if (hour >= 24) {
        hour = hour - 24;
      }
      
      return {
        hour: hour % 24,
        minute,
        display: `${(hour % 24).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
        position: (totalMinutesFromStart / totalMinutes) * 100
      };
    });
  };

  const timeScale = generateTimeScale();

  const [dragState, setDragState] = useState(null);
  const [ghostElement, setGhostElement] = useState(null);
  const timelineRef = useRef(null);

  const getShiftTime = (shiftType, empIndex = null) => {
    const shiftData = shiftTypes[shiftType];
    
    // Handle flexible shifts
    if (shiftData?.isFlexible && getFlexibleShiftData && empIndex !== null) {
      const flexibleData = getFlexibleShiftData(empIndex, selectedDay);
      if (flexibleData) {
        const startMinutes = flexibleData.startMinutes || 0;
        const endMinutes = flexibleData.endMinutes || 0;
        const startHours = flexibleData.start + (startMinutes / 60);
        const endHours = flexibleData.end + (endMinutes / 60);
        
        return {
          start: startHours,
          end: endHours,
          label: shiftData.label,
          isFlexible: true,
          startDisplay: `${flexibleData.start.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`,
          endDisplay: `${flexibleData.end.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
        };
      }
    }
    
    if (!shiftData || shiftData.start === null) return null;
    return {
      start: shiftData.start + (shiftData.startMinutes || 0) / 60,
      end: shiftData.end + (shiftData.endMinutes || 0) / 60,
      label: shiftData.label,
      isFlexible: false
    };
  };

  // Функция для позиционирования смены в рабочих часах
  const getShiftPosition = (shiftTime) => {
    if (!shiftTime) return { left: 0, width: 0 };
    
    const workingStart = workingHours.start + (workingHours.startMinutes || 0) / 60;
    const workingEnd = workingHours.end + (workingHours.endMinutes || 0) / 60;
    
    // Обработка времени через полночь
    let workingDuration;
    if (workingEnd <= workingStart) {
      workingDuration = (24 - workingStart) + workingEnd;
    } else {
      workingDuration = workingEnd - workingStart;
    }
    
    // Нормализация времени смены для расчета позиции
    let normalizedShiftStart = shiftTime.start;
    let normalizedShiftEnd = shiftTime.end;
    
    // Если рабочее время через полночь, нормализуем время смены
    if (workingEnd <= workingStart) {
      if (normalizedShiftStart < workingStart && normalizedShiftStart >= workingEnd) {
        // Смена не попадает в рабочие часы
        return { left: 0, width: 0 };
      }
      
      // Если время смены меньше чем время начала работы, добавляем 24 часа
      if (normalizedShiftStart < workingStart) {
        normalizedShiftStart += 24;
      }
      if (normalizedShiftEnd < workingStart && normalizedShiftEnd <= workingEnd) {
        normalizedShiftEnd += 24;
      }
    }
    
    const shiftStart = Math.max(workingStart, normalizedShiftStart);
    const shiftEnd = Math.min(workingStart + workingDuration, normalizedShiftEnd);
    const shiftDuration = Math.max(0, shiftEnd - shiftStart);
    
    return {
      left: ((shiftStart - workingStart) / workingDuration) * 100,
      width: (shiftDuration / workingDuration) * 100
    };
  };

  const handleMouseDown = (e, empIndex, shiftType) => {
    if (!shiftTypes[shiftType]?.isFlexible) return;
    
    e.preventDefault();
    const timeline = e.currentTarget.parentElement;
    const rect = timeline.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startHour = (startX / rect.width) * 24;
    
    const shiftTime = getShiftTime(shiftType, empIndex);
    const isResizing = e.target.classList.contains('resize-handle');
    
    // Создаём ghost элемент
    const shiftPosition = getShiftPosition(shiftTime);
    setGhostElement({
      empIndex,
      shiftType,
      position: shiftPosition,
      isDragging: true
    });
    
    setDragState({
      empIndex,
      shiftType,
      startX,
      startHour,
      isResizing,
      resizeType: isResizing ? (e.target.classList.contains('resize-left') ? 'left' : 'right') : null,
      originalStart: shiftTime?.start || 9,
      originalEnd: shiftTime?.end || 17,
      timelineRect: rect
    });
  };

  const handleMouseMove = (e) => {
    if (!dragState) return;
    
    const workingStart = workingHours.start + (workingHours.startMinutes || 0) / 60;
    const workingEnd = workingHours.end + (workingHours.endMinutes || 0) / 60;
    let workingDuration;
    if (workingEnd <= workingStart) {
      workingDuration = (24 - workingStart) + workingEnd;
    } else {
      workingDuration = workingEnd - workingStart;
    }
    
    const currentX = e.clientX - dragState.timelineRect.left;
    const relativePosition = currentX / dragState.timelineRect.width;
    const currentHour = workingStart + (relativePosition * workingDuration);
    
    let newStart = dragState.originalStart;
    let newEnd = dragState.originalEnd;
    
    if (dragState.isResizing) {
      if (dragState.resizeType === 'left') {
        newStart = Math.max(workingStart, Math.min(currentHour, dragState.originalEnd - 0.5));
      } else {
        newEnd = Math.max(dragState.originalStart + 0.5, Math.min(workingStart + workingDuration, currentHour));
      }
    } else {
      const duration = dragState.originalEnd - dragState.originalStart;
      const centerPoint = currentHour;
      newStart = Math.max(workingStart, Math.min(workingStart + workingDuration - duration, centerPoint - duration / 2));
      newEnd = newStart + duration;
    }
    
    // Convert to hours and minutes
    const startHours = Math.floor(newStart);
    const startMinutes = Math.round((newStart - startHours) * 60);
    const endHours = Math.floor(newEnd);
    const endMinutes = Math.round((newEnd - endHours) * 60);
    
    // Обновляем ghost элемент
    const tempShiftTime = { start: newStart, end: newEnd };
    const tempPosition = getShiftPosition(tempShiftTime);
    setGhostElement(prev => prev ? { ...prev, position: tempPosition } : null);

    // Создаем/обновляем направляющие линии
    const timelineContainer = document.querySelector('.timeline-container');
    if (timelineContainer) {
      // Удаляем старые линии
      const existingLines = document.querySelectorAll('.timeline-guide-line');
      existingLines.forEach(line => line.remove());

      // Получаем позицию timeline-timeline элемента
      const timelineTimeline = timelineContainer.querySelector('.timeline-timeline');
      if (timelineTimeline) {
        const timelineRect = timelineTimeline.getBoundingClientRect();
        const containerRect = timelineContainer.getBoundingClientRect();
        
        // Вычисляем позиции линий
        const leftPos = timelineRect.left + (tempPosition.left / 100) * timelineRect.width;
        const rightPos = timelineRect.left + ((tempPosition.left + tempPosition.width) / 100) * timelineRect.width;
        
        // Создаем левую линию
        const leftLine = document.createElement('div');
        leftLine.className = 'timeline-guide-line';
        leftLine.style.cssText = `
          position: fixed;
          top: ${containerRect.top}px;
          bottom: 0;
          left: ${leftPos}px;
          width: 1px;
          height: ${containerRect.height}px;
          background: #007bff;
          z-index: 1000;
          pointer-events: none;
        `;
        
        // Создаем правую линию
        const rightLine = document.createElement('div');
        rightLine.className = 'timeline-guide-line';
        rightLine.style.cssText = `
          position: fixed;
          top: ${containerRect.top}px;
          bottom: 0;
          left: ${rightPos}px;
          width: 1px;
          height: ${containerRect.height}px;
          background: #007bff;
          z-index: 1000;
          pointer-events: none;
        `;
        
        document.body.appendChild(leftLine);
        document.body.appendChild(rightLine);
      }
    }

    if (onFlexibleShiftUpdate) {
      onFlexibleShiftUpdate(dragState.empIndex, selectedDay, {
        start: startHours,
        startMinutes,
        end: endHours,
        endMinutes
      });
    }
  };

  const handleMouseUp = () => {
    // Удаляем направляющие линии
    const existingLines = document.querySelectorAll('.timeline-guide-line');
    existingLines.forEach(line => line.remove());
    
    setDragState(null);
    setGhostElement(null);
  };

  React.useEffect(() => {
    if (dragState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState]);

  return (
    <div className="timeline-view">
      <div className="timeline-container">
        <div className="time-scale">
          <div className="time-scale-header">
            <div className="time-scale-label">Время</div>
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
          <div className="time-hours">
            {timeScale.map((timePoint, index) => (
              <div key={index} className="time-hour">
                {timePoint.display}
              </div>
            ))}
          </div>
        </div>
        
        <div className="timeline-employees">
          <div className="timeline-employees-header">Сотрудник</div>
          <div className="timeline-rows">
            {employees.map((employee, empIndex) => {
              const shiftType = getScheduleByDate(empIndex, selectedDay);
              const cellTagsForDate = getCellTagsByDate(empIndex, selectedDay);
              const shiftTime = shiftType ? getShiftTime(shiftType, empIndex) : null;
              
              if (!shouldShowEmployee(empIndex)) return null;
              
              return (
                <div key={empIndex} className="timeline-row">
                  <div className="timeline-employee-name">{typeof employee === 'string' ? employee : employee.name}</div>
                  <div className="timeline-timeline" ref={timelineRef}>
                    {timeScale.map((timePoint, index) => (
                      <div key={index} className="timeline-hour-cell"></div>
                    ))}
                    
                    {shiftTime && (
                      <div 
                        className={`timeline-shift shift-${shiftType} ${shiftTime.isFlexible ? 'flexible-shift' : ''} ${
                          ghostElement && ghostElement.empIndex === empIndex && ghostElement.isDragging ? 'dragging' : ''
                        }`}
                        style={{
                          left: `${getShiftPosition(shiftTime).left}%`,
                          width: `${getShiftPosition(shiftTime).width}%`,
                          opacity: ghostElement && ghostElement.empIndex === empIndex && ghostElement.isDragging ? 0.5 : 1
                        }}
                        onClick={() => !shiftTime.isFlexible && onTagClick(empIndex, selectedDay)}
                        onMouseDown={(e) => handleMouseDown(e, empIndex, shiftType)}
                      >
                        {shiftTime.isFlexible && (
                          <>
                            <div className="resize-handle resize-left"></div>
                            <div className="resize-handle resize-right"></div>
                          </>
                        )}
                        <span className="timeline-shift-label">
                          {shiftTime.isFlexible ? (
                            `${shiftTime.label} (${shiftTime.startDisplay}-${shiftTime.endDisplay})`
                          ) : (
                            `${shiftTime.label} (${shiftTime.start}:00-${shiftTime.end}:00)`
                          )}
                        </span>
                        <div className="timeline-tags">
                          {cellTagsForDate && cellTagsForDate.map((tagKey) => {
                            const tag = tags[tagKey];
                            if (!tag) return null;
                            return (
                              <span
                                key={tagKey}
                                className="timeline-tag"
                                style={{ backgroundColor: tag.color }}
                                title={tag.label}
                              >
                                {tag.shortLabel}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {shiftType && !shiftTime && (
                      <div 
                        className={`timeline-status shift-${shiftType}`}
                        onClick={() => onTagClick(empIndex, selectedDay)}
                      >
                        <span className="timeline-status-label">
                          {shiftType === 'off' && 'Выходной'}
                          {shiftType === 'vacation' && 'Отпуск'}
                          {shiftType === 'sick' && 'Больничный'}
                        </span>
                        <div className="timeline-tags">
                          {cellTagsForDate && cellTagsForDate.map((tagKey) => {
                            const tag = tags[tagKey];
                            if (!tag) return null;
                            return (
                              <span
                                key={tagKey}
                                className="timeline-tag"
                                style={{ backgroundColor: tag.color }}
                                title={tag.label}
                              >
                                {tag.shortLabel}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {!shiftType && (
                      <div 
                        className="timeline-empty"
                        onClick={() => onTagClick(empIndex, selectedDay)}
                      >
                        <div className="timeline-tags">
                          {cellTagsForDate && cellTagsForDate.map((tagKey) => {
                            const tag = tags[tagKey];
                            if (!tag) return null;
                            return (
                              <span
                                key={tagKey}
                                className="timeline-tag"
                                style={{ backgroundColor: tag.color }}
                                title={tag.label}
                              >
                                {tag.shortLabel}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;