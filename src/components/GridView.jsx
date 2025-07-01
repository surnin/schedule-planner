import React, { useState } from 'react';
import InlineTimePicker from './InlineTimePicker';

const GridView = ({ 
  employees, 
  schedule, 
  shiftTypes,
  selectedCells,
  bulkEditMode,
  cellTags,
  tags,
  dayLabels,
  viewPeriod,
  getScheduleByDate,
  getCellTagsByDate,
  getDateKey,
  onCellClick,
  onCellRightClick,
  onDateClick,
  shouldShowEmployee,
  getDayType,
  cellViewSettings,
  getFlexibleShiftData,
  onFlexibleTimeUpdate
}) => {
  const [inlineTimePicker, setInlineTimePicker] = useState({ 
    open: false, 
    empIndex: null, 
    dayIndex: null, 
    position: { top: 0, left: 0 } 
  });
  
  const [dragSelect, setDragSelect] = useState({ 
    isDragging: false, 
    startCell: null, 
    currentCell: null,
    dragSelection: new Set()
  });
  const getShiftText = (shiftType) => {
    return shiftTypes[shiftType]?.shortLabel || '';
  };

  const getShiftTime = (shiftType, withoutDash = false, empIndex = null, dayIndex = null) => {
    const shift = shiftTypes[shiftType];
    
    // Если это гибкая смена, получаем данные из flexibleShifts
    if (shift?.isFlexible && getFlexibleShiftData && empIndex !== null && dayIndex !== null) {
      const flexibleData = getFlexibleShiftData(empIndex, dayIndex);
      if (flexibleData) {
        const startMinutes = flexibleData.startMinutes || 0;
        const endMinutes = flexibleData.endMinutes || 0;
        const startTime = `${flexibleData.start.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
        const endTime = `${flexibleData.end.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        
        if (withoutDash) {
          return `${startTime}\n${endTime}`;
        }
        
        return `${startTime}-${endTime}`;
      }
    }
    
    if (!shift || shift.start === null) return '';
    
    const startMinutes = shift.startMinutes || 0;
    const endMinutes = shift.endMinutes || 0;
    const startTime = `${shift.start.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
    const endTime = `${shift.end.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    
    if (withoutDash) {
      return `${startTime}\n${endTime}`;
    }
    
    return `${startTime}-${endTime}`;
  };

  const getShiftDisplay = (shiftType, empIndex = null, dayIndex = null) => {
    const showTime = cellViewSettings?.showTime !== false; // по умолчанию true
    
    if (showTime) {
      return getShiftTime(shiftType, true, empIndex, dayIndex) || getShiftText(shiftType); // без тире
    } else {
      return getShiftText(shiftType);
    }
  };

  const handleFlexibleCellDoubleClick = (e, empIndex, dayIndex, shiftType) => {
    if (shiftTypes[shiftType]?.isFlexible) {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      
      setInlineTimePicker({
        open: true,
        empIndex,
        dayIndex,
        position: {
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX
        }
      });
    }
  };

  const handleInlineTimeConfirm = (startTime, endTime) => {
    const { empIndex, dayIndex } = inlineTimePicker;
    if (empIndex !== null && dayIndex !== null && onFlexibleTimeUpdate) {
      onFlexibleTimeUpdate(empIndex, dayIndex, {
        start: startTime.hours,
        startMinutes: startTime.minutes || 0,
        end: endTime.hours,
        endMinutes: endTime.minutes || 0
      });
    }
  };

  const handleCellMouseDown = (e, empIndex, dayIndex) => {
    if (!bulkEditMode) return;
    
    // Сохраняем информацию о начале возможного протягивания
    const cellKey = getDateKey(empIndex, dayIndex);
    
    setDragSelect({
      isDragging: true,
      startCell: { empIndex, dayIndex },
      currentCell: { empIndex, dayIndex },
      dragSelection: new Set([cellKey])
    });
  };

  const handleCellMouseEnter = (empIndex, dayIndex) => {
    if (!dragSelect.isDragging || !bulkEditMode) return;
    
    const newSelection = new Set();
    const startEmp = Math.min(dragSelect.startCell.empIndex, empIndex);
    const endEmp = Math.max(dragSelect.startCell.empIndex, empIndex);
    const startDay = Math.min(dragSelect.startCell.dayIndex, dayIndex);
    const endDay = Math.max(dragSelect.startCell.dayIndex, dayIndex);
    
    for (let emp = startEmp; emp <= endEmp; emp++) {
      for (let day = startDay; day <= endDay; day++) {
        newSelection.add(getDateKey(emp, day));
      }
    }
    
    setDragSelect(prev => ({
      ...prev,
      currentCell: { empIndex, dayIndex },
      dragSelection: newSelection
    }));
  };

  const handleCellMouseUp = (e) => {
    if (dragSelect.isDragging) {
      // Для протягивания обновляем selectedCells через callback
      if (dragSelect.dragSelection.size > 1) {
        // Только для множественного выделения (протягивание)
        const newSelectedCells = new Set(selectedCells);
        
        if (e.ctrlKey || e.metaKey) {
          // С Ctrl/Cmd инвертируем выделение (toggle)
          dragSelect.dragSelection.forEach(cellKey => {
            if (newSelectedCells.has(cellKey)) {
              newSelectedCells.delete(cellKey);
            } else {
              newSelectedCells.add(cellKey);
            }
          });
        } else {
          // Без Ctrl просто добавляем к существующему выделению
          dragSelect.dragSelection.forEach(cellKey => {
            newSelectedCells.add(cellKey);
          });
        }
        
        // Обновляем состояние через родительский компонент
        selectedCells.clear();
        newSelectedCells.forEach(cellKey => selectedCells.add(cellKey));
      }
      // Для одиночного клика оставляем обработку в handleCellClick
      
      setDragSelect({
        isDragging: false,
        startCell: null,
        currentCell: null,
        dragSelection: new Set()
      });
    }
  };

  return (
    <div className="grid-view">
      <div className="schedule-grid">
        <div className="grid-header">
          <div>Имя</div>
          {dayLabels.map((label, index) => {
            const dayType = getDayType ? getDayType(index) : { isWeekend: false, isFirstOfMonth: false };
            const className = `date-header ${dayType.isWeekend ? 'weekend' : ''} ${dayType.isFirstOfMonth ? 'first-of-month' : ''}`;
            
            return (
              <div 
                key={index}
                className={className}
                onClick={() => onDateClick(index)}
              >
                {label}
              </div>
            );
          })}
        </div>
        {employees.map((employee, empIndex) => {
          if (!shouldShowEmployee(empIndex)) return null;
          
          return (
            <div className="grid-row" key={empIndex}>
              <div className="employee-name">{typeof employee === 'string' ? employee : employee.name}</div>
              {Array.from({ length: viewPeriod }, (_, dayIndex) => {
                const dateKey = getDateKey(empIndex, dayIndex);
                const shiftType = getScheduleByDate(empIndex, dayIndex);
                const cellTagsForDate = getCellTagsByDate(empIndex, dayIndex);
                const isSelected = selectedCells.has(dateKey) || dragSelect.dragSelection.has(dateKey);
                const dayType = getDayType ? getDayType(dayIndex) : { isWeekend: false, isFirstOfMonth: false };
                const cellClassName = `day-cell ${isSelected ? 'selected' : ''} ${bulkEditMode ? 'bulk-mode' : ''} ${dayType.isWeekend ? 'weekend-cell' : ''} ${dayType.isFirstOfMonth ? 'first-of-month-cell' : ''} ${dragSelect.isDragging ? 'drag-selecting' : ''}`;
                
                return (
                  <div
                    key={dayIndex}
                    className={cellClassName}
                    onClick={() => onCellClick(empIndex, dayIndex)}
                    onContextMenu={onCellRightClick}
                    onMouseDown={(e) => handleCellMouseDown(e, empIndex, dayIndex)}
                    onMouseEnter={() => handleCellMouseEnter(empIndex, dayIndex)}
                    onMouseUp={(e) => handleCellMouseUp(e)}
                  >
                    {shiftType && (
                      <div 
                        className={`shift-card shift-${shiftType} ${shiftTypes[shiftType]?.isFlexible ? 'flexible-editable flexible-full-cell' : ''}`}
                        onDoubleClick={(e) => handleFlexibleCellDoubleClick(e, empIndex, dayIndex, shiftType)}
                      >
                        <div className={`shift-symbol ${cellViewSettings?.showTime !== false ? 'time-display' : ''}`}>
                          {getShiftDisplay(shiftType, empIndex, dayIndex)}
                        </div>
                        <div className="shift-tags">
                          {cellTagsForDate && cellTagsForDate.map((tagKey) => {
                            const tag = tags[tagKey];
                            if (!tag) return null;
                            return (
                              <span
                                key={tagKey}
                                className="shift-tag"
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
                      <div className="empty-cell">
                        <div className="shift-tags">
                          {cellTagsForDate && cellTagsForDate.map((tagKey) => {
                            const tag = tags[tagKey];
                            if (!tag) return null;
                            return (
                              <span
                                key={tagKey}
                                className="shift-tag"
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
                );
              })}
            </div>
          );
        })}
      </div>
      
      <InlineTimePicker
        isOpen={inlineTimePicker.open}
        onClose={() => setInlineTimePicker(prev => ({ ...prev, open: false }))}
        onConfirm={handleInlineTimeConfirm}
        initialStart={
          inlineTimePicker.empIndex !== null && inlineTimePicker.dayIndex !== null ? 
          (() => {
            const flexData = getFlexibleShiftData(inlineTimePicker.empIndex, inlineTimePicker.dayIndex);
            return flexData ? { hours: flexData.start, minutes: flexData.startMinutes || 0 } : { hours: 9, minutes: 0 };
          })() : { hours: 9, minutes: 0 }
        }
        initialEnd={
          inlineTimePicker.empIndex !== null && inlineTimePicker.dayIndex !== null ? 
          (() => {
            const flexData = getFlexibleShiftData(inlineTimePicker.empIndex, inlineTimePicker.dayIndex);
            return flexData ? { hours: flexData.end, minutes: flexData.endMinutes || 0 } : { hours: 18, minutes: 0 };
          })() : { hours: 18, minutes: 0 }
        }
        position={inlineTimePicker.position}
      />
    </div>
  );
};

export default GridView;