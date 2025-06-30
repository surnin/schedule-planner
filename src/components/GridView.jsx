import React from 'react';

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
  shouldShowEmployee
}) => {
  const getShiftText = (shiftType) => {
    return shiftTypes[shiftType]?.shortLabel || '';
  };

  return (
    <div className="grid-view">
      <div className="schedule-grid">
        <div className="grid-header">
          <div>Имя</div>
          {dayLabels.map((label, index) => {
            // Determine if it's weekend based on day of week (Saturday=6, Sunday=0)
            const dayOfWeek = (index % 7);
            const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Saturday or Sunday
            
            return (
              <div 
                key={index}
                className={`date-header ${isWeekend ? 'weekend' : ''}`}
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
              <div className="employee-name">{employee}</div>
              {Array.from({ length: viewPeriod }, (_, dayIndex) => {
                const dateKey = getDateKey(empIndex, dayIndex);
                const shiftType = getScheduleByDate(empIndex, dayIndex);
                const cellTagsForDate = getCellTagsByDate(empIndex, dayIndex);
                const isSelected = selectedCells.has(dateKey);
                
                return (
                  <div
                    key={dayIndex}
                    className={`day-cell ${isSelected ? 'selected' : ''} ${bulkEditMode ? 'bulk-mode' : ''}`}
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
          );
        })}
      </div>
    </div>
  );
};

export default GridView;