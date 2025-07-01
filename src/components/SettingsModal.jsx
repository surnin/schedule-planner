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
  onSendTestMessage,
  onAdminChange,
  onRemoveAdmin,
  onAddAdmin
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
            className={`tab-btn ${activeTab === 'cellview' ? 'active' : ''}`}
            onClick={() => setActiveTab('cellview')}
          >
            Вид ячейки
          </button>
          <button 
            className={`tab-btn ${activeTab === 'admins' ? 'active' : ''}`}
            onClick={() => setActiveTab('admins')}
          >
            Администраторы
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
              
              <div className="working-hours-section">
                <h4>Рабочие часы</h4>
                <p className="working-hours-description">
                  Глобальная настройка определяет диапазон времени, отображаемый в таймлайне. 
                  Типы смен могут использовать только время в пределах этого диапазона.
                </p>
                <div className="working-hours-inputs">
                  <div className="time-range">
                    <label>От:</label>
                    <TimeSelect 
                      value={{ hours: settings.workingHours?.start || 8, minutes: settings.workingHours?.startMinutes || 0 }}
                      onChange={(time) => onSettingsChange('workingHours', { 
                        ...settings.workingHours, 
                        start: time.hours, 
                        startMinutes: time.minutes || 0 
                      })}
                    />
                  </div>
                  <div className="time-range">
                    <label>До:</label>
                    <TimeSelect 
                      value={{ hours: settings.workingHours?.end || 22, minutes: settings.workingHours?.endMinutes || 0 }}
                      onChange={(time) => onSettingsChange('workingHours', { 
                        ...settings.workingHours, 
                        end: time.hours, 
                        endMinutes: time.minutes || 0 
                      })}
                    />
                  </div>
                </div>
              </div>


              <div className="settings-divider"></div>

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
                              onShiftTypeChange(key, 'startTime', time);
                            }}
                          />
                          <TimeSelect
                            value={{ hours: shiftType.end, minutes: shiftType.endMinutes || 0 }}
                            placeholder="Конец"
                            onChange={(time) => {
                              onShiftTypeChange(key, 'endTime', time);
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


          {activeTab === 'admins' && (
            <div className="settings-section">
              <h3>Администраторы</h3>
              <div className="admin-info">
                <p><strong>🔒 Информация:</strong></p>
                <p>Администраторы могут редактировать расписание. Для входа в режим редактирования нужно ввести имя и пароль администратора.</p>
              </div>
              <button 
                className="add-btn"
                onClick={onAddAdmin}
              >
                + Добавить администратора
              </button>
              <div className="admins-list">
                {(settings.admins || []).map((admin, index) => (
                  <div key={index} className="admin-item">
                    <div className="admin-inputs">
                      <input 
                        type="text" 
                        placeholder="Имя администратора"
                        value={admin.name}
                        onChange={(e) => onAdminChange(index, 'name', e.target.value)}
                      />
                      <input 
                        type="password" 
                        placeholder="Пароль"
                        value={admin.password}
                        onChange={(e) => onAdminChange(index, 'password', e.target.value)}
                      />
                    </div>
                    <button 
                      className="remove-btn"
                      onClick={() => onRemoveAdmin(index)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {(!settings.admins || settings.admins.length === 0) && (
                  <div className="no-admins-info">
                    <p>⚠️ Нет администраторов. Пока что редактирование доступно всем.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'cellview' && (
            <div className="settings-section">
              <h3>Вид ячейки</h3>
              <div className="cell-view-settings">
                <div className="setting-item">
                  <label className="toggle-setting">
                    <input 
                      type="checkbox"
                      checked={settings.cellView?.showTime !== false}
                      onChange={(e) => onSettingsChange('cellView', {
                        ...settings.cellView,
                        showTime: e.target.checked
                      })}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Выводить время смены в названии</span>
                  </label>
                  <div className="setting-description">
                    Если включено - показывает время смены (10:00-23:50), если выключено - показывает символ смены (У, Д, В, Н)
                  </div>
                </div>
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
              
              <div className="settings-divider"></div>
              
              <h3>Telegram Bot</h3>
              <div className="telegram-settings">
                <div className="telegram-info">
                  <p><strong>📋 Инструкция по настройке:</strong></p>
                  <ol>
                    <li>Создайте бота через <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">@BotFather</a></li>
                    <li>Получите токен бота</li>
                    <li>Добавьте бота в чат или найдите Chat ID через <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer">@userinfobot</a></li>
                    <li>Введите данные ниже и включите уведомления</li>
                  </ol>
                </div>
                
                <label>
                  <input 
                    type="checkbox"
                    checked={settings.telegram?.enabled || false}
                    onChange={(e) => onSettingsChange('telegram.enabled', e.target.checked)}
                  />
                  Включить Telegram уведомления
                </label>
                
                <input 
                  type="password"
                  placeholder="Bot Token (например: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)"
                  value={settings.telegram?.botToken || ''}
                  onChange={(e) => onSettingsChange('telegram.botToken', e.target.value)}
                  disabled={!settings.telegram?.enabled}
                />
                
                <input 
                  type="text"
                  placeholder="Chat ID (например: -1001234567890 или 123456789)"
                  value={settings.telegram?.chatId || ''}
                  onChange={(e) => onSettingsChange('telegram.chatId', e.target.value)}
                  disabled={!settings.telegram?.enabled}
                />
                
                {settings.telegram?.enabled && settings.telegram?.botToken && settings.telegram?.chatId && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      alert('Тестовое сообщение будет отправлено при публикации');
                    }}
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