import React, { useState } from 'react';

const ShiftAndTagPopup = ({ 
  isOpen,
  shiftTypes,
  availableTags,
  selectedTags,
  selectedCells,
  bulkEditMode,
  onShiftChange,
  onTagToggle,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('shifts');

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h3>
            {bulkEditMode && selectedCells.size > 0 
              ? `Редактирование ${selectedCells.size} ячеек` 
              : 'Редактирование ячейки'
            }
          </h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="popup-tabs">
          <button 
            className={`tab-btn ${activeTab === 'shifts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shifts')}
          >
            Смены
          </button>
          <button 
            className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            Теги
          </button>
        </div>
        
        <div className="popup-content">
          {activeTab === 'shifts' && (
            <div className="shifts-tab">
              <div className="shift-options">
                {Object.entries(shiftTypes).map(([key, shiftType]) => (
                  <div 
                    key={key} 
                    className={`shift-option shift-${key}`} 
                    onClick={() => onShiftChange(key)}
                  >
                    <div className="shift-option-content">
                      <span className="shift-label">{shiftType.label}</span>
                      {shiftType.time && <span className="shift-time">{shiftType.time}</span>}
                    </div>
                  </div>
                ))}
                <div 
                  className="shift-option clear-option" 
                  onClick={() => onShiftChange('clear')}
                >
                  <div className="shift-option-content">
                    <span className="shift-label">Очистить</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'tags' && (
            <div className="tags-tab">
              <div className="tag-management-grid">
                {Object.entries(availableTags).map(([key, tag]) => {
                  const isSelected = selectedTags.includes(key);
                  return (
                    <div
                      key={key}
                      className={`tag-management-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => onTagToggle(key)}
                    >
                      <div 
                        className="tag-color-preview"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.shortLabel}
                      </div>
                      <span className="tag-label">{tag.label}</span>
                      <div className="tag-action">
                        {isSelected ? (
                          <span className="remove-indicator">Удалить</span>
                        ) : (
                          <span className="add-indicator">Добавить</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {Object.keys(availableTags).length === 0 && (
                <div className="no-tags-message">
                  <p>Нет доступных тегов.</p>
                  <p>Создайте теги в настройках.</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="popup-footer">
          <button className="btn btn-cancel" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftAndTagPopup;