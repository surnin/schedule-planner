import React, { useState, useEffect, useRef } from 'react';

const ColorPicker = ({ value, onChange, label = "Цвет" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const predefinedColors = [
    '#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', 
    '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3',
    '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#10AC84', '#EE5A24', '#0984E3', '#6C5CE7',
    '#A29BFE', '#FD79A8', '#E17055', '#00B894'
  ];

  const handleColorSelect = (color) => {
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div className="color-picker" ref={containerRef}>
      <label className="color-picker-label">{label}</label>
      <div className="color-picker-container">
        <button
          type="button"
          className="color-picker-trigger"
          onClick={() => setIsOpen(!isOpen)}
          style={{ backgroundColor: value || '#e0e0e0' }}
        >
          <span className="color-picker-value">{value || 'Выбрать'}</span>
        </button>
        
        {isOpen && (
          <div className="color-picker-dropdown">
            <div className="color-picker-colors">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${value === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
            <div className="color-picker-custom">
              <input
                type="color"
                value={value || '#e0e0e0'}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="color-picker-input"
              />
              <span>Свой цвет</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorPicker;