import React from 'react';
import DateSelector from './DateSelector';

const GanttView = ({ 
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
  shouldShowEmployee
}) => {
  const getDayLabel = (dayIndex) => {
    return dayLabels[dayIndex] || '';
  };

  const getShiftTime = (shiftType) => {
    const shiftData = shiftTypes[shiftType];
    if (!shiftData || shiftData.start === null) return null;
    return {
      start: shiftData.start,
      end: shiftData.end,
      label: shiftData.label
    };
  };

  return (
    <div className="gantt-view">
      <div className="gantt-header">
        <h2>Расписание на {getDayLabel(selectedDay)}</h2>
        <button className="back-btn" onClick={onBackToGrid}>
          ← Вернуться к календарю
        </button>
      </div>
      
      <DateSelector 
        selectedDay={selectedDay}
        onDaySelect={onDaySelect}
        dayLabels={dayLabels}
      />
      
      <div className="gantt-container">
        <div className="time-scale">
          <div className="time-scale-header">Время</div>
          <div className="time-hours">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="time-hour">
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>
        </div>
        
        <div className="gantt-employees">
          <div className="gantt-employees-header">Сотрудник</div>
          <div className="gantt-rows">
            {employees.map((employee, empIndex) => {
              const shiftType = getScheduleByDate(empIndex, selectedDay);
              const cellTagsForDate = getCellTagsByDate(empIndex, selectedDay);
              const shiftTime = shiftType ? getShiftTime(shiftType) : null;
              
              if (!shouldShowEmployee(empIndex)) return null;
              
              return (
                <div key={empIndex} className="gantt-row">
                  <div className="gantt-employee-name">{employee}</div>
                  <div className="gantt-timeline">
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div key={hour} className="gantt-hour-cell"></div>
                    ))}
                    
                    {shiftTime && (
                      <div 
                        className={`gantt-shift shift-${shiftType}`}
                        style={{
                          left: `${(shiftTime.start / 24) * 100}%`,
                          width: `${((shiftTime.end - shiftTime.start) / 24) * 100}%`
                        }}
                        onClick={() => onTagClick(empIndex, selectedDay)}
                      >
                        <span className="gantt-shift-label">
                          {shiftTime.label} ({shiftTime.start}:00-{shiftTime.end}:00)
                        </span>
                        <div className="gantt-tags">
                          {cellTagsForDate && cellTagsForDate.map((tagKey) => {
                            const tag = tags[tagKey];
                            if (!tag) return null;
                            return (
                              <span
                                key={tagKey}
                                className="gantt-tag"
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
                        className={`gantt-status shift-${shiftType}`}
                        onClick={() => onTagClick(empIndex, selectedDay)}
                      >
                        <span className="gantt-status-label">
                          {shiftType === 'off' && 'Выходной'}
                          {shiftType === 'vacation' && 'Отпуск'}
                          {shiftType === 'sick' && 'Больничный'}
                        </span>
                        <div className="gantt-tags">
                          {cellTagsForDate && cellTagsForDate.map((tagKey) => {
                            const tag = tags[tagKey];
                            if (!tag) return null;
                            return (
                              <span
                                key={tagKey}
                                className="gantt-tag"
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
                        className="gantt-empty"
                        onClick={() => onTagClick(empIndex, selectedDay)}
                      >
                        <div className="gantt-tags">
                          {cellTagsForDate && cellTagsForDate.map((tagKey) => {
                            const tag = tags[tagKey];
                            if (!tag) return null;
                            return (
                              <span
                                key={tagKey}
                                className="gantt-tag"
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

export default GanttView;