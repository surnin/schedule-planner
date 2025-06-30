import React, { useState } from 'react';
import TimeSelect from './TimeSelect';
import ColorPicker from './ColorPicker';

const SettingsModal = ({ 
  isOpen,
  settings,
  connectionState,
  onClose,
  onEmployeeChange,
  onRemoveEmployee,
  onAddEmployee,
  onShiftTypeChange,
  onRemoveShiftType,
  onAddShiftType,
  onTagChange,
  onRemoveTag,
  onAddTag,
  onSettingsChange,
  onSendTestMessage
}) => {
  const [activeTab, setActiveTab] = useState('employees');

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Настройки</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-tabs">
          <button 
            className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            Сотрудники
          </button>
          <button 
            className={`tab-btn ${activeTab === 'shifts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shifts')}
          >
            Типы смен
          </button>
          <button 
            className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            Теги
          </button>
          <button 
            className={`tab-btn ${activeTab === 'sync' ? 'active' : ''}`}
            onClick={() => setActiveTab('sync')}
          >
            Синхронизация
          </button>
          <button 
            className={`tab-btn ${activeTab === 'debug' ? 'active' : ''}`}
            onClick={() => setActiveTab('debug')}
          >
            Отладка
          </button>
        </div>
        
        <div className="settings-content">
          {activeTab === 'employees' && (
            <div className="settings-section">
              <h3>Сотрудники</h3>
              <button 
                className="add-btn"
                onClick={onAddEmployee}
              >
                + Добавить сотрудника
              </button>
              <div className="employees-list">
                {settings.employees.map((employee, index) => (
                  <div key={index} className="employee-item">
                    <input 
                      type="text" 
                      value={employee}
                      onChange={(e) => onEmployeeChange(index, e.target.value)}
                    />
                    <button 
                      className="remove-btn"
                      onClick={() => onRemoveEmployee(index)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'shifts' && (
            <div className="settings-section">
              <h3>Типы смен</h3>
              <button 
                className="add-btn"
                onClick={onAddShiftType}
              >
                + Добавить тип смены
              </button>
              <div className="shift-types-list">
                {Object.entries(settings.shiftTypes).map(([key, shiftType]) => (
                  <div key={key} className="shift-type-item">
                    <div className="shift-type-inputs">
                      <input 
                        type="text" 
                        placeholder="Название"
                        value={shiftType.label}
                        onChange={(e) => onShiftTypeChange(key, 'label', e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="Краткое"
                        value={shiftType.shortLabel}
                        maxLength={2}
                        onChange={(e) => onShiftTypeChange(key, 'shortLabel', e.target.value)}
                      />
                      <ColorPicker
                        value={shiftType.color}
                        onChange={(color) => onShiftTypeChange(key, 'color', color)}
                        label="Цвет"
                      />
                      {shiftType.start !== null && (
                        <>
                          <TimeSelect
                            value={{ hours: shiftType.start, minutes: shiftType.startMinutes || 0 }}
                            placeholder="Начало"
                            onChange={(time) => {
                              onShiftTypeChange(key, 'start', time.hours);
                              onShiftTypeChange(key, 'startMinutes', time.minutes);
                            }}
                          />
                          <TimeSelect
                            value={{ hours: shiftType.end, minutes: shiftType.endMinutes || 0 }}
                            placeholder="Конец"
                            onChange={(time) => {
                              onShiftTypeChange(key, 'end', time.hours);
                              onShiftTypeChange(key, 'endMinutes', time.minutes);
                            }}
                          />
                        </>
                      )}
                    </div>
                    <button 
                      className="remove-btn"
                      onClick={() => onRemoveShiftType(key)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="settings-section">
              <h3>Теги</h3>
              <button 
                className="add-btn"
                onClick={onAddTag}
              >
                + Добавить тег
              </button>
              <div className="tags-list">
                {Object.entries(settings.tags || {}).map(([key, tag]) => (
                  <div key={key} className="tag-item">
                    <div className="tag-inputs">
                      <input 
                        type="text" 
                        placeholder="Название"
                        value={tag.label}
                        maxLength={10}
                        onChange={(e) => onTagChange(key, 'label', e.target.value)}
                      />
                      <input 
                        type="text" 
                        placeholder="Символ"
                        value={tag.shortLabel}
                        maxLength={1}
                        onChange={(e) => onTagChange(key, 'shortLabel', e.target.value)}
                      />
                      <ColorPicker
                        value={tag.color}
                        onChange={(color) => onTagChange(key, 'color', color)}
                        label="Цвет"
                      />
                    </div>
                    <button 
                      className="remove-btn"
                      onClick={() => onRemoveTag(key)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="settings-section">
              <h3>Ably Real-time Sync</h3>
              <div className="websocket-settings">
                <div className="ably-info">
                  <p><strong>📋 Инструкция по настройке:</strong></p>
                  <ol>
                    <li>Зарегистрируйтесь на <a href="https://ably.com" target="_blank" rel="noopener noreferrer">ably.com</a> (бесплатно)</li>
                    <li>Создайте новое приложение</li>
                    <li>Скопируйте API ключ из раздела "API Keys"</li>
                    <li>Введите данные ниже и включите синхронизацию</li>
                  </ol>
                </div>
                
                <label>
                  <input 
                    type="checkbox"
                    checked={settings.websocket.enabled}
                    onChange={(e) => onSettingsChange('websocket.enabled', e.target.checked)}
                  />
                  Включить real-time синхронизацию
                </label>
                
                <input 
                  type="password"
                  placeholder="Ably API Key (например: abc123.def456:xyz789)"
                  value={settings.websocket.apiKey}
                  onChange={(e) => onSettingsChange('websocket.apiKey', e.target.value)}
                  disabled={!settings.websocket.enabled}
                />
                
                <input 
                  type="text"
                  placeholder="Room ID (например: simple-scheduler-mv)"
                  value={settings.websocket.roomId}
                  onChange={(e) => onSettingsChange('websocket.roomId', e.target.value)}
                  disabled={!settings.websocket.enabled}
                />
                
                {connectionState === 'connected' && (
                  <div className="ably-status success">
                    ✅ Подключено! Изменения синхронизируются в реальном времени
                  </div>
                )}
                
                {connectionState === 'failed' && (
                  <div className="ably-status error">
                    ❌ Ошибка подключения. Проверьте API ключ и интернет-соединение
                  </div>
                )}
                
                {connectionState === 'connected' && (
                  <button 
                    className="btn btn-primary"
                    onClick={onSendTestMessage}
                    style={{ marginTop: '10px' }}
                  >
                    🧪 Тест отправки сообщения
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'debug' && (
            <div className="settings-section">
              <h3>Отладка</h3>
              <div className="debug-settings">
                <label>
                  <input 
                    type="checkbox"
                    checked={settings.debug}
                    onChange={(e) => onSettingsChange('debug', e.target.checked)}
                  />
                  Включить режим отладки (показывать логи в консоли)
                </label>
                
                {settings.debug && (
                  <div className="debug-info">
                    <p>🐛 <strong>Режим отладки включен</strong></p>
                    <p>Все действия синхронизации будут отображаться в консоли браузера (F12 → Console)</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="settings-footer">
          <button className="btn btn-cancel" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={onClose}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;