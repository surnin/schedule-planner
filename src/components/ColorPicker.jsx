import React, { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';

const ColorPicker = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPredefined, setShowPredefined] = useState(true);
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

  const handlePickerChange = (color) => {
    onChange(color);
  };

  return (
    <div className="color-picker" ref={containerRef}>
      <div className="color-picker-container">
        <button
          type="button"
          className="color-picker-trigger"
          onClick={() => setIsOpen(!isOpen)}
          style={{ backgroundColor: value || '#e0e0e0' }}
        >
        </button>
        
        {isOpen && (
          <div className="color-picker-dropdown">
            <div className="color-picker-tabs">
              <button 
                type="button"
                className={`color-tab ${showPredefined ? 'active' : ''}`}
                onClick={() => setShowPredefined(true)}
              >
                Готовые
              </button>
              <button 
                type="button"
                className={`color-tab ${!showPredefined ? 'active' : ''}`}
                onClick={() => setShowPredefined(false)}
              >
                Палитра
              </button>
            </div>
            
            {showPredefined ? (
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
            ) : (
              <div className="color-picker-palette">
                <HexColorPicker 
                  color={value || '#e0e0e0'} 
                  onChange={handlePickerChange}
                />
                <div className="color-picker-input-group">
                  <button 
                    type="button"
                    className="color-apply-btn"
                    onClick={() => setIsOpen(false)}
                  >
                    ОК
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorPicker;