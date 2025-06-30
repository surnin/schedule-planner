import React from 'react';
import { dayLabels } from '../constants/defaultData';

const Header = ({ 
  currentView, 
  selectedDay, 
  bulkEditMode,
  dropdownOpen,
  onViewSwitch,
  onBulkEditToggle,
  onSettingsOpen,
  onExportData,
  onImportData,
  onClearAllData,
  onDropdownToggle,
  connectionState,
  onlineUsers,
  websocketEnabled
}) => {
  const getDayLabel = (dayIndex) => {
    return dayLabels[dayIndex] || '';
  };

  return (
    <div className="header">
      <div className="header-left">
        <h1>Расписание смен</h1>
        {websocketEnabled && (
          <div className={`connection-status ${connectionState}`}>
            {connectionState === 'connected' && '🟢 Подключено'}
            {connectionState === 'connecting' && '🟡 Подключение...'}
            {connectionState === 'disconnected' && '🔴 Отключено'}
            {connectionState === 'failed' && '❌ Ошибка'}
            {onlineUsers.size > 1 && ` (${onlineUsers.size})`}
          </div>
        )}
      </div>
      
      <div className="header-controls">
        <div className="view-toggle">
          <button 
            className={`view-btn ${currentView === 'grid' ? 'active' : ''}`}
            onClick={() => onViewSwitch('grid')}
          >
            Календарь
          </button>
          {selectedDay !== null && (
            <button 
              className={`view-btn ${currentView === 'gantt' ? 'active' : ''}`}
              onClick={() => onViewSwitch('gantt')}
            >
              Ганта ({getDayLabel(selectedDay)})
            </button>
          )}
        </div>
        
        <div className="data-controls">
          <button 
            className={`bulk-edit-btn ${bulkEditMode ? 'active' : ''}`}
            onClick={onBulkEditToggle}
          >
            {bulkEditMode ? 'Выйти из массового режима' : 'Массовое редактирование'}
          </button>
          
          <div className={`dropdown ${dropdownOpen ? 'open' : ''}`}>
            <button 
              className="dropdown-btn"
              onClick={onDropdownToggle}
            >
              ⚙️
            </button>
            <div className="dropdown-content">
              <button onClick={() => {
                onSettingsOpen();
                onDropdownToggle();
              }}>⚙️ Настройки</button>
              <button onClick={() => {
                onExportData();
                onDropdownToggle();
              }}>📥 Экспорт данных</button>
              <label className="import-btn">
                📤 Импорт данных
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={(e) => {
                    onImportData(e);
                    onDropdownToggle();
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              <button onClick={() => {
                onClearAllData();
                onDropdownToggle();
              }} className="danger-btn">🗑️ Очистить все</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;