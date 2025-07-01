import React from 'react';

const Legend = ({ shiftTypes }) => {
  return (
    <div className="legend">
      <div className="legend-header">Легенда:</div>
      <div className="legend-items">
        {Object.entries(shiftTypes).map(([key, shiftType]) => (
          <div 
            key={key}
            className="legend-item"
            title={shiftType.label}
          >
            <div className={`legend-color shift-${key}`}></div>
            <span>{shiftType.label}</span>
          </div>
        ))}
        <div 
          className="legend-item"
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