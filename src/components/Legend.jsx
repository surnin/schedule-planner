import React from 'react';

const Legend = ({ shiftTypes, filters, onFilterToggle }) => {
  return (
    <div className="legend">
      <div className="filter-header">Фильтры:</div>
      <div className="filter-items">
        {Object.entries(shiftTypes).map(([key, shiftType]) => (
          <div 
            key={key}
            className={`legend-item filter ${filters[key] ? 'active' : 'inactive'}`}
            onClick={() => onFilterToggle(key)}
            title={shiftType.label}
          >
            <div className={`legend-color shift-${key}`}></div>
            <span>{shiftType.label}</span>
          </div>
        ))}
        <div 
          className={`legend-item filter ${filters.empty ? 'active' : 'inactive'}`}
          onClick={() => onFilterToggle('empty')}
          title="Пустые ячейки"
        >
          <div className="legend-color empty-shift"></div>
          <span>—</span>
        </div>
      </div>
    </div>
  );
};

export default Legend;