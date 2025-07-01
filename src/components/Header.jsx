import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faCog, faLock, faLockOpen } from '@fortawesome/free-solid-svg-icons';
import { faTelegram } from '@fortawesome/free-brands-svg-icons';

const Header = ({ 
  currentView, 
  selectedDay, 
  bulkEditMode,
  dropdownOpen,
  dayLabels,
  onViewSwitch,
  onBulkEditToggle,
  onSettingsOpen,
  onExportData,
  onImportData,
  onClearAllData,
  onDropdownToggle,
  onPublish,
  onDownloadPDF,
  onUnlock,
  onLock,
  isAuthenticated,
  hasAdmins,
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
              className={`view-btn ${currentView === 'timeline' ? 'active' : ''}`}
              onClick={() => onViewSwitch('timeline')}
            >
              Таймлайн ({getDayLabel(selectedDay)})
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
          
          <div className="header-btn-group">
            <button 
              className="header-btn telegram"
              onClick={onPublish}
              title="Опубликовать в Telegram"
            >
              <FontAwesomeIcon icon={faTelegram} />
            </button>
            <div className="btn-divider"></div>
            <button 
              className="header-btn download"
              onClick={onDownloadPDF}
              title="Скачать PDF"
            >
              <FontAwesomeIcon icon={faDownload} />
            </button>
          </div>
          
          {hasAdmins && (
            <button 
              className={`header-btn lock-btn ${isAuthenticated ? 'unlocked' : 'locked'}`}
              onClick={isAuthenticated ? onLock : onUnlock}
              title={isAuthenticated ? 'Заблокировать редактирование' : 'Разблокировать редактирование'}
            >
              <FontAwesomeIcon icon={isAuthenticated ? faLockOpen : faLock} />
            </button>
          )}
          
          <div className={`dropdown ${dropdownOpen ? 'open' : ''}`}>
            <button 
              className="header-btn dropdown-btn"
              onClick={onDropdownToggle}
              title="Настройки и дополнительно"
            >
              <FontAwesomeIcon icon={faCog} />
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