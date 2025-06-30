import React from 'react';
import { dayLabels } from '../constants/defaultData';

const TimelineView = ({ 
  employees, 
  schedule, 
  shiftTypes,
  selectedCells,
  bulkEditMode,
  cellTags,
  tags,
  onCellClick,
  onCellRightClick,
  onTagClick,
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
            {dayLabels.map((label, index) => (
              <div 
                key={index}
                className={`timeline-date ${
                  index === 5 || index === 6 || index === 12 || index === 13 ? 'weekend' : ''
                } ${index === 8 ? 'today' : ''}`}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
        {employees.map((employee, empIndex) => {
          if (!shouldShowEmployee(empIndex)) return null;
          
          return (
            <div className="timeline-row" key={empIndex}>
              <div className="timeline-employee">{employee}</div>
              <div className="timeline-schedule">
                {Array.from({ length: 14 }, (_, dayIndex) => {
                  const key = `${empIndex}-${dayIndex}`;
                  const isSelected = selectedCells.has(key);
                  return (
                    <div
                      key={dayIndex}
                      className={`timeline-cell ${isSelected ? 'selected' : ''} ${bulkEditMode ? 'bulk-mode' : ''}`}
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
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineView;