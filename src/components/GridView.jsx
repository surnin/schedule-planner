import React from 'react';
import { dayLabels } from '../constants/defaultData';

const GridView = ({ 
  employees, 
  schedule, 
  shiftTypes,
  selectedCells,
  bulkEditMode,
  cellTags,
  tags,
  onCellClick,
  onCellRightClick,
  onDateClick,
  onTagClick,
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
          {dayLabels.map((label, index) => (
            <div 
              key={index}
              className={`date-header ${
                index === 5 || index === 6 || index === 12 || index === 13 ? 'weekend' : ''
              } ${index === 8 ? 'today' : ''}`}
              onClick={() => onDateClick(index)}
            >
              {label}
            </div>
          ))}
        </div>
        {employees.map((employee, empIndex) => {
          if (!shouldShowEmployee(empIndex)) return null;
          
          return (
            <div className="grid-row" key={empIndex}>
              <div className="employee-name">{employee}</div>
              {Array.from({ length: 14 }, (_, dayIndex) => {
                const key = `${empIndex}-${dayIndex}`;
                const isSelected = selectedCells.has(key);
                return (
                  <div
                    key={dayIndex}
                    className={`day-cell ${isSelected ? 'selected' : ''} ${bulkEditMode ? 'bulk-mode' : ''}`}
                    onClick={() => onCellClick(empIndex, dayIndex)}
                    onContextMenu={onCellRightClick}
                  >
                    {schedule[key] && (
                      <div className={`shift-card shift-${schedule[key]}`}>
                        <div className="shift-symbol">
                          {getShiftText(schedule[key])}
                        </div>
                        <div className="shift-tags">
                          {cellTags[key] && cellTags[key].map((tagKey, tagIndex) => {
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
                    {!schedule[key] && (
                      <div className="empty-cell">
                        <div className="shift-tags">
                          {cellTags[key] && cellTags[key].map((tagKey, tagIndex) => {
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