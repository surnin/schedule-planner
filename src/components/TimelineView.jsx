import React from 'react';

const TimelineView = ({ 
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
  shouldShowEmployee
}) => {
  const getShiftText = (shiftType) => {
    return shiftTypes[shiftType]?.shortLabel || '';
  };

  return (
    <div className="timeline-view">
      <div className="timeline-container">
        <div className="timeline-header">
          <div className="timeline-employee-header">Сотрудник</div>
          <div className="timeline-dates">
            {dayLabels.map((label, index) => {
              const dayOfWeek = (index % 7);
              const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
              
              return (
                <div 
                  key={index}
                  className={`timeline-date ${isWeekend ? 'weekend' : ''}`}
                >
                  {label}
                </div>
              );
            })}
          </div>
        </div>
        {employees.map((employee, empIndex) => {
          if (!shouldShowEmployee(empIndex)) return null;
          
          return (
            <div className="timeline-row" key={empIndex}>
              <div className="timeline-employee">{employee}</div>
              <div className="timeline-schedule">
                {Array.from({ length: viewPeriod }, (_, dayIndex) => {
                  const dateKey = getDateKey(empIndex, dayIndex);
                  const shiftType = getScheduleByDate(empIndex, dayIndex);
                  const cellTagsForDate = getCellTagsByDate(empIndex, dayIndex);
                  const isSelected = selectedCells.has(dateKey);
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`timeline-cell ${isSelected ? 'selected' : ''} ${bulkEditMode ? 'bulk-mode' : ''}`}
                      onClick={() => onCellClick(empIndex, dayIndex)}
                      onContextMenu={onCellRightClick}
                    >
                      {shiftType && (
                        <div className={`shift-card shift-${shiftType}`}>
                          <div className="shift-symbol">
                            {getShiftText(shiftType)}
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineView;