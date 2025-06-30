import React, { useState, useEffect, useRef } from 'react'
import * as Ably from 'ably'
import './App.css'

/*
  РЕАЛИЗАЦИЯ REAL-TIME СИНХРОНИЗАЦИИ С ABLY
  
  ABLY БЕСПЛАТНЫЙ ТАРИФ 2024:
  - 200 одновременных подключений (отлично для команд)
  - 6 млн сообщений в месяц  
  - 200 каналов
  - Поддержка Chrome Extensions (Manifest v3)
  - 99.999% SLA надежность
  
  НАСТРОЙКА ДЛЯ ПОЛЬЗОВАТЕЛЯ:
  1. Регистрация на ably.com (бесплатно)
  2. Создание нового приложения
  3. Копирование API ключа
  4. Ввод API ключа и Room ID в настройки расширения
  
  ВОЗМОЖНОСТИ:
  - Real-time синхронизация изменений расписания
  - Автоматическое переподключение
  - Показ активных пользователей (presence)
  - История изменений (1 день на бесплатном тарифе)
*/

const defaultEmployees = [
  'Ильвина', 'Инесса', 'Альбина', 'Анастасия', 'Арина',
  'Ксения', 'Света', 'Елена', 'Леся', 'Алия', 'Даша'
];

const defaultShiftTypes = {
  morning: { label: 'Утро', time: '8:00-16:00', shortLabel: 'У', start: 8, end: 16 },
  day: { label: 'День', time: '10:00-18:00', shortLabel: 'Д', start: 10, end: 18 },
  evening: { label: 'Вечер', time: '16:00-00:00', shortLabel: 'В', start: 16, end: 24 },
  night: { label: 'Ночь', time: '00:00-08:00', shortLabel: 'Н', start: 0, end: 8 },
  off: { label: 'Выходной', time: '', shortLabel: 'В', start: null, end: null },
  vacation: { label: 'Отпуск', time: '', shortLabel: 'О', start: null, end: null },
  sick: { label: 'Больничный', time: '', shortLabel: 'Б', start: null, end: null }
};

const initialData = {
  'Альбина': ['off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off'],
  'Анастасия': [],
  'Арина': ['off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off', 'off'],
  'Алия': ['', '', 'off', 'off', '', '', '', 'off', '', '', '', '', '', '']
};

function App() {
  // Ably клиент
  const ablyClient = useRef(null);
  const channel = useRef(null);
  const myClientId = useRef(null);
  
  // Состояние подключения
  const [connectionState, setConnectionState] = useState('disconnected');
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Настройки приложения
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('schedule-planner-settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading settings from localStorage:', e);
      }
    }
    return {
      employees: defaultEmployees,
      shiftTypes: defaultShiftTypes,
      websocket: {
        url: '',
        apiKey: '',
        roomId: '',
        enabled: false
      },
      debug: false
    };
  });

  const [schedule, setSchedule] = useState(() => {
    const saved = localStorage.getItem('schedule-planner-data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading schedule from localStorage:', e);
      }
    }
    
    const initial = {};
    settings.employees.forEach((emp, empIndex) => {
      for (let day = 0; day < 14; day++) {
        const key = `${empIndex}-${day}`;
        if (initialData[emp] && initialData[emp][day]) {
          initial[key] = initialData[emp][day];
        }
      }
    });
    return initial;
  });

  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('schedule-planner-view') || 'grid';
  });

  const [popup, setPopup] = useState({ open: false, empIndex: null, dayIndex: null });
  const [settingsModal, setSettingsModal] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('employees');
  
  const [selectedDay, setSelectedDay] = useState(() => {
    const saved = localStorage.getItem('schedule-planner-selected-day');
    return saved ? parseInt(saved) : null;
  });

  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('schedule-planner-filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading filters from localStorage:', e);
      }
    }
    return {
      morning: true,
      day: true,
      evening: true,
      night: true,
      off: true,
      vacation: true,
      sick: true,
      empty: true
    };
  });

  // Сохранение данных в localStorage
  useEffect(() => {
    localStorage.setItem('schedule-planner-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('schedule-planner-data', JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem('schedule-planner-view', currentView);
  }, [currentView]);

  useEffect(() => {
    localStorage.setItem('schedule-planner-filters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    if (selectedDay !== null) {
      localStorage.setItem('schedule-planner-selected-day', selectedDay.toString());
    }
  }, [selectedDay]);

  // Функция для debug логирования
  const debugLog = (message, ...args) => {
    if (settings.debug) {
      console.log(message, ...args);
    }
  };

  // Ably подключение и отключение
  const connectToAbly = async () => {
    if (!settings.websocket.enabled || 
        !settings.websocket.apiKey.trim() || 
        !settings.websocket.roomId.trim()) {
      debugLog('Недостаточно данных для подключения к Ably');
      return;
    }

    try {
      setConnectionState('connecting');
      
      // Генерируем уникальный ID клиента
      myClientId.current = `user-${Math.random().toString(36).substr(2, 9)}`;
      
      // Создаем клиент Ably
      ablyClient.current = new Ably.Realtime({
        key: settings.websocket.apiKey,
        clientId: myClientId.current,
        recover: true
      });

      // Подписываемся на события подключения
      ablyClient.current.connection.on('connected', () => {
        setConnectionState('connected');
        debugLog('Подключено к Ably. Client ID:', myClientId.current);
        debugLog('Room ID:', settings.websocket.roomId);
      });

      ablyClient.current.connection.on('disconnected', () => {
        setConnectionState('disconnected');
        debugLog('Отключено от Ably');
      });

      ablyClient.current.connection.on('failed', (error) => {
        setConnectionState('failed');
        console.error('Ошибка подключения к Ably:', error);
      });

      // Получаем канал (убираем пробелы из Room ID)
      const roomId = settings.websocket.roomId.trim();
      channel.current = ablyClient.current.channels.get(roomId);
      debugLog('Подключаемся к каналу:', roomId);

      // Подписываемся на состояние канала
      channel.current.on('attached', () => {
        debugLog('✅ Канал подключен и готов к работе');
      });

      channel.current.on('failed', (err) => {
        console.error('❌ Ошибка канала:', err);
      });

      // Подписываемся на изменения расписания
      channel.current.subscribe('schedule-update', (message) => {
        debugLog('📨 Получено обновление расписания:', message.data);
        debugLog('👤 От пользователя:', message.data?.userId, 'Мой ID:', myClientId.current);
        // Игнорируем собственные сообщения
        if (message.data && message.data.schedule && message.data.userId !== myClientId.current) {
          debugLog('✅ Применяем изменения расписания от другого пользователя');
          setSchedule(message.data.schedule);
        } else {
          debugLog('⏭️ Игнорируем собственное сообщение');
        }
      });

      // Подписываемся на изменения настроек
      channel.current.subscribe('settings-update', (message) => {
        debugLog('Получено обновление настроек:', message.data);
        // Игнорируем собственные сообщения
        if (message.data && message.data.settings && message.data.userId !== myClientId.current) {
          debugLog('Применяем изменения настроек от другого пользователя');
          // Обновляем только employees и shiftTypes, не websocket настройки
          setSettings(prev => ({
            ...prev,
            employees: message.data.settings.employees || prev.employees,
            shiftTypes: message.data.settings.shiftTypes || prev.shiftTypes
          }));
        }
      });

      // Подписываемся на тестовые сообщения
      channel.current.subscribe('test-message', (message) => {
        debugLog('🧪 Получено тестовое сообщение:', message.data);
        if (message.data.userId !== myClientId.current) {
          debugLog('✅ Тест синхронизации прошел успешно!');
        }
      });

      // Presence - показ активных пользователей
      channel.current.presence.enter({ 
        username: `Пользователь ${Math.floor(Math.random() * 1000)}`,
        joinedAt: new Date().toISOString()
      });

      channel.current.presence.subscribe((presenceMsg) => {
        channel.current.presence.get((err, members) => {
          if (!err && Array.isArray(members)) {
            setOnlineUsers(new Set(members.map(member => member.data.username)));
          }
        });
      });

    } catch (error) {
      console.error('Ошибка при подключении к Ably:', error);
      setConnectionState('failed');
    }
  };

  const disconnectFromAbly = () => {
    if (channel.current) {
      try {
        channel.current.presence.leave();
        channel.current.unsubscribe();
      } catch (error) {
        debugLog('Ошибка при отключении канала (норм):', error.message);
      }
      channel.current = null;
    }

    if (ablyClient.current) {
      try {
        ablyClient.current.close();
      } catch (error) {
        debugLog('Ошибка при закрытии клиента (норм):', error.message);
      }
      ablyClient.current = null;
    }

    myClientId.current = null;
    setConnectionState('disconnected');
    setOnlineUsers(new Set());
  };

  // Отправка изменений в Ably
  const publishScheduleUpdate = (newSchedule) => {
    debugLog('🔄 Попытка отправки обновления расписания');
    debugLog('📊 State - channel:', !!channel.current, 'connected:', connectionState === 'connected');
    
    if (channel.current && connectionState === 'connected') {
      const message = {
        schedule: newSchedule,
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      debugLog('📤 Отправляем обновление расписания:', message);
      
      channel.current.publish('schedule-update', message).then(() => {
        debugLog('✅ Сообщение успешно отправлено');
      }).catch((error) => {
        console.error('❌ Ошибка отправки сообщения:', error);
      });
    } else {
      debugLog('❌ Не можем отправить: канал не готов или не подключен');
    }
  };

  const publishSettingsUpdate = (newSettings) => {
    if (channel.current && connectionState === 'connected') {
      const message = {
        settings: {
          employees: newSettings.employees,
          shiftTypes: newSettings.shiftTypes
        },
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      debugLog('Отправляем обновление настроек:', message);
      channel.current.publish('settings-update', message);
    }
  };

  // Подключение/отключение при изменении настроек
  useEffect(() => {
    // Отключаемся от предыдущего соединения
    disconnectFromAbly();
    
    // Подключаемся только если все данные введены
    if (settings.websocket.enabled && 
        settings.websocket.apiKey.trim() && 
        settings.websocket.roomId.trim()) {
      // Небольшая задержка чтобы избежать проблем с React Strict Mode
      const timer = setTimeout(() => {
        connectToAbly();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        disconnectFromAbly();
      };
    }
    
    return () => {
      disconnectFromAbly();
    };
  }, [settings.websocket.enabled, settings.websocket.apiKey, settings.websocket.roomId]);

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Обработчики изменений настроек с синхронизацией
  const handleEmployeeChange = (index, value) => {
    const newEmployees = [...settings.employees];
    newEmployees[index] = value;
    const newSettings = { ...settings, employees: newEmployees };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleRemoveEmployee = (index) => {
    const newEmployees = settings.employees.filter((_, i) => i !== index);
    const newSettings = { ...settings, employees: newEmployees };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleAddEmployee = () => {
    const newSettings = { 
      ...settings, 
      employees: [...settings.employees, 'Новый сотрудник'] 
    };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleShiftTypeChange = (key, field, value) => {
    const newShiftTypes = {
      ...settings.shiftTypes,
      [key]: { ...settings.shiftTypes[key], [field]: value }
    };
    
    // Обновляем time для смен с временем
    if (field === 'start' || field === 'end') {
      const shiftType = newShiftTypes[key];
      if (shiftType.start !== null && shiftType.end !== null) {
        newShiftTypes[key].time = `${shiftType.start}:00-${shiftType.end}:00`;
      }
    }
    
    const newSettings = { ...settings, shiftTypes: newShiftTypes };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleRemoveShiftType = (key) => {
    const newShiftTypes = { ...settings.shiftTypes };
    delete newShiftTypes[key];
    const newSettings = { ...settings, shiftTypes: newShiftTypes };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const getShiftText = (shiftType) => {
    return settings.shiftTypes[shiftType]?.shortLabel || '';
  };

  const handleShiftChange = (shiftType) => {
    debugLog('🔄 handleShiftChange вызван с типом:', shiftType);
    let newSchedule;
    
    if (bulkEditMode && selectedCells.size > 0) {
      // Массовое редактирование
      setSchedule(prev => {
        newSchedule = { ...prev };
        selectedCells.forEach(cellKey => {
          if (shiftType === 'clear') {
            delete newSchedule[cellKey];
          } else {
            newSchedule[cellKey] = shiftType;
          }
        });
        debugLog('📊 Новое расписание (массовое):', newSchedule);
        publishScheduleUpdate(newSchedule);
        return newSchedule;
      });
      setSelectedCells(new Set());
    } else {
      // Обычное редактирование
      if (popup.empIndex === null || popup.dayIndex === null) return;
      
      const key = `${popup.empIndex}-${popup.dayIndex}`;
      setSchedule(prev => {
        newSchedule = { ...prev };
        if (shiftType === 'clear') {
          delete newSchedule[key];
        } else {
          newSchedule[key] = shiftType;
        }
        debugLog('📊 Новое расписание (обычное):', newSchedule);
        publishScheduleUpdate(newSchedule);
        return newSchedule;
      });
    }
    
    setPopup({ open: false, empIndex: null, dayIndex: null });
  };

  const openPopup = (empIndex, dayIndex) => {
    setPopup({ open: true, empIndex, dayIndex });
  };

  const closePopup = () => {
    setPopup({ open: false, empIndex: null, dayIndex: null });
  };

  const switchView = (view) => {
    setCurrentView(view);
  };

  const handleCellClick = (empIndex, dayIndex, event) => {
    if (bulkEditMode) {
      const key = `${empIndex}-${dayIndex}`;
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
        return newSet;
      });
    } else {
      openPopup(empIndex, dayIndex);
    }
  };

  const handleCellRightClick = (event) => {
    if (bulkEditMode && selectedCells.size > 0) {
      event.preventDefault();
      setPopup({ open: true, empIndex: null, dayIndex: null });
    }
  };

  const toggleFilter = (filterType) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  const shouldShowEmployee = (empIndex) => {
    for (let day = 0; day < 14; day++) {
      const key = `${empIndex}-${day}`;
      const shiftType = schedule[key];
      
      if (!shiftType && filters.empty) return true;
      if (shiftType && filters[shiftType]) return true;
    }
    return false;
  };

  const toggleBulkEdit = () => {
    setBulkEditMode(!bulkEditMode);
    setSelectedCells(new Set());
  };

  const handleDateClick = (dayIndex) => {
    setSelectedDay(dayIndex);
    setCurrentView('gantt');
  };

  const getShiftTime = (shiftType) => {
    const shiftData = settings.shiftTypes[shiftType];
    if (!shiftData || shiftData.start === null) return null;
    return {
      start: shiftData.start,
      end: shiftData.end,
      label: shiftData.label
    };
  };

  const getDayLabel = (dayIndex) => {
    const days = [
      'пн 23', 'вт 24', 'ср 25', 'чт 26', 'пт 27', 'сб 28', 'вс 29',
      'пн 30', 'вт 1', 'ср 2', 'чт 3', 'пт 4', 'сб 5', 'вс 6'
    ];
    return days[dayIndex] || '';
  };

  // Функции экспорта и импорта
  const exportData = () => {
    const data = {
      schedule,
      filters,
      currentView,
      selectedDay,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `schedule-planner-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.schedule) {
          setSchedule(data.schedule);
          // Отправляем импортированное расписание через Ably
          publishScheduleUpdate(data.schedule);
        }
        if (data.filters) setFilters(data.filters);
        if (data.currentView) setCurrentView(data.currentView);
        if (data.selectedDay !== undefined) setSelectedDay(data.selectedDay);
        
        alert('Данные успешно импортированы!');
      } catch (error) {
        alert('Ошибка при импорте данных. Проверьте формат файла.');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    if (confirm('Вы уверены, что хотите очистить все данные? Это действие нельзя отменить.')) {
      const emptySchedule = {};
      setSchedule(emptySchedule);
      
      // Отправляем пустое расписание через Ably
      publishScheduleUpdate(emptySchedule);
      
      setFilters({
        morning: true,
        day: true,
        evening: true,
        night: true,
        off: true,
        vacation: true,
        sick: true,
        empty: true
      });
      setCurrentView('grid');
      setSelectedDay(null);
      setBulkEditMode(false);
      setSelectedCells(new Set());
      
      // Очистка localStorage
      localStorage.removeItem('schedule-planner-data');
      localStorage.removeItem('schedule-planner-view');
      localStorage.removeItem('schedule-planner-filters');
      localStorage.removeItem('schedule-planner-selected-day');
      
      alert('Все данные очищены!');
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Расписание смен</h1>
        <div className="header-controls">
          <div className="view-toggle">
            <button 
              className={`view-btn ${currentView === 'grid' ? 'active' : ''}`}
              onClick={() => switchView('grid')}
            >
              Календарь
            </button>
            <button 
              className={`view-btn ${currentView === 'timeline' ? 'active' : ''}`}
              onClick={() => switchView('timeline')}
            >
              Timeline
            </button>
            {selectedDay !== null && (
              <button 
                className={`view-btn ${currentView === 'gantt' ? 'active' : ''}`}
                onClick={() => switchView('gantt')}
              >
                Ганта ({getDayLabel(selectedDay)})
              </button>
            )}
          </div>
          <div className="data-controls">
            <button 
              className={`bulk-edit-btn ${bulkEditMode ? 'active' : ''}`}
              onClick={toggleBulkEdit}
            >
              {bulkEditMode ? 'Выйти из массового режима' : 'Массовое редактирование'}
            </button>
            
            <div className={`dropdown ${dropdownOpen ? 'open' : ''}`}>
              <button 
                className="dropdown-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                ⚙️ Управление
              </button>
              <div className="dropdown-content">
                <button onClick={() => {
                  setSettingsModal(true);
                  setDropdownOpen(false);
                }}>⚙️ Настройки</button>
                <button onClick={() => {
                  exportData();
                  setDropdownOpen(false);
                }}>📥 Экспорт данных</button>
                <label className="import-btn">
                  📤 Импорт данных
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={(e) => {
                      importData(e);
                      setDropdownOpen(false);
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                <button onClick={() => {
                  clearAllData();
                  setDropdownOpen(false);
                }} className="danger-btn">🗑️ Очистить все</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="content">
        <div className="status-bar">
          <div className="save-status">
            💾 Данные автоматически сохраняются в браузере
          </div>
          {settings.websocket.enabled && (
            <div className={`connection-status ${connectionState}`}>
              {connectionState === 'connected' && '🟢 Подключено'}
              {connectionState === 'connecting' && '🟡 Подключение...'}
              {connectionState === 'disconnected' && '🔴 Отключено'}
              {connectionState === 'failed' && '❌ Ошибка подключения'}
              {onlineUsers.size > 1 && ` (${onlineUsers.size} пользователей онлайн)`}
            </div>
          )}
        </div>

        <div className="legend">
          <div className="filter-header">Фильтры:</div>
          {Object.entries(settings.shiftTypes).map(([key, shiftType]) => (
            <div 
              key={key}
              className={`legend-item filter ${filters[key] ? 'active' : 'inactive'}`}
              onClick={() => toggleFilter(key)}
            >
              <div className={`legend-color shift-${key}`}></div>
              <span>{shiftType.label} {shiftType.time && `(${shiftType.time})`}</span>
            </div>
          ))}
          <div 
            className={`legend-item filter ${filters.empty ? 'active' : 'inactive'}`}
            onClick={() => toggleFilter('empty')}
          >
            <div className="legend-color empty-shift"></div>
            <span>Пустые</span>
          </div>
        </div>

        {/* Календарная сетка */}
        {currentView === 'grid' && (
          <div className="grid-view">
            <div className="schedule-grid">
              <div className="grid-header">
                <div>Имя</div>
                <div className="weekend date-header" onClick={() => handleDateClick(0)}>пн<br />23</div>
                <div className="date-header" onClick={() => handleDateClick(1)}>вт<br />24</div>
                <div className="date-header" onClick={() => handleDateClick(2)}>ср<br />25</div>
                <div className="date-header" onClick={() => handleDateClick(3)}>чт<br />26</div>
                <div className="date-header" onClick={() => handleDateClick(4)}>пт<br />27</div>
                <div className="weekend date-header" onClick={() => handleDateClick(5)}>сб<br />28</div>
                <div className="weekend date-header" onClick={() => handleDateClick(6)}>вс<br />29</div>
                <div className="date-header" onClick={() => handleDateClick(7)}>пн<br />30</div>
                <div className="today date-header" onClick={() => handleDateClick(8)}>вт<br />1</div>
                <div className="date-header" onClick={() => handleDateClick(9)}>ср<br />2</div>
                <div className="date-header" onClick={() => handleDateClick(10)}>чт<br />3</div>
                <div className="date-header" onClick={() => handleDateClick(11)}>пт<br />4</div>
                <div className="weekend date-header" onClick={() => handleDateClick(12)}>сб<br />5</div>
                <div className="weekend date-header" onClick={() => handleDateClick(13)}>вс<br />6</div>
              </div>
              {settings.employees.map((employee, empIndex) => {
                if (!shouldShowEmployee(empIndex)) return null;
                
                return (
                  <div className="grid-row" key={empIndex}>
                    <div className="employee-name">{employee}</div>
                    {Array.from({ length: 14 }, (_, dayIndex) => {
                      const key = `${empIndex}-${dayIndex}`;
                      const isSelected = selectedCells.has(key);
                      return (
                        <div
                          key={dayIndex}
                          className={`day-cell ${isSelected ? 'selected' : ''} ${bulkEditMode ? 'bulk-mode' : ''}`}
                          onClick={(e) => handleCellClick(empIndex, dayIndex, e)}
                          onContextMenu={handleCellRightClick}
                        >
                          {schedule[key] && (
                            <div className={`shift-indicator shift-${schedule[key]}`}>
                              {getShiftText(schedule[key])}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timeline вид */}
        {currentView === 'timeline' && (
          <div className="timeline-view">
            <div className="timeline-container">
              <div className="timeline-header">
                <div className="timeline-employee-header">Сотрудник</div>
                <div className="timeline-dates">
                  <div className="timeline-date weekend">пн 23</div>
                  <div className="timeline-date">вт 24</div>
                  <div className="timeline-date">ср 25</div>
                  <div className="timeline-date">чт 26</div>
                  <div className="timeline-date">пт 27</div>
                  <div className="timeline-date weekend">сб 28</div>
                  <div className="timeline-date weekend">вс 29</div>
                  <div className="timeline-date">пн 30</div>
                  <div className="timeline-date today">вт 1</div>
                  <div className="timeline-date">ср 2</div>
                  <div className="timeline-date">чт 3</div>
                  <div className="timeline-date">пт 4</div>
                  <div className="timeline-date weekend">сб 5</div>
                  <div className="timeline-date weekend">вс 6</div>
                </div>
              </div>
              {settings.employees.map((employee, empIndex) => {
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
                            onClick={(e) => handleCellClick(empIndex, dayIndex, e)}
                            onContextMenu={handleCellRightClick}
                          >
                            {schedule[key] && (
                              <div className={`timeline-shift shift-${schedule[key]}`}>
                                {getShiftText(schedule[key])}
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
        )}

        {/* Gantt Timeline вид */}
        {currentView === 'gantt' && selectedDay !== null && (
          <div className="gantt-view">
            <div className="gantt-header">
              <h2>Расписание на {getDayLabel(selectedDay)}</h2>
              <button className="back-btn" onClick={() => setCurrentView('grid')}>
                ← Вернуться к календарю
              </button>
            </div>
            
            <div className="gantt-container">
              {/* Временная шкала */}
              <div className="time-scale">
                <div className="time-scale-header">Время</div>
                <div className="time-hours">
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div key={hour} className="time-hour">
                      {hour.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Сотрудники и их смены */}
              <div className="gantt-employees">
                <div className="gantt-employees-header">Сотрудник</div>
                <div className="gantt-rows">
                  {settings.employees.map((employee, empIndex) => {
                    const key = `${empIndex}-${selectedDay}`;
                    const shiftType = schedule[key];
                    const shiftTime = shiftType ? getShiftTime(shiftType) : null;
                    
                    if (!shouldShowEmployee(empIndex)) return null;
                    
                    return (
                      <div key={empIndex} className="gantt-row">
                        <div className="gantt-employee-name">{employee}</div>
                        <div className="gantt-timeline">
                          {/* 24 часовая сетка */}
                          {Array.from({ length: 24 }, (_, hour) => (
                            <div key={hour} className="gantt-hour-cell"></div>
                          ))}
                          
                          {/* Блок смены */}
                          {shiftTime && (
                            <div 
                              className={`gantt-shift shift-${shiftType}`}
                              style={{
                                left: `${(shiftTime.start / 24) * 100}%`,
                                width: `${((shiftTime.end - shiftTime.start) / 24) * 100}%`
                              }}
                            >
                              <span className="gantt-shift-label">
                                {shiftTime.label} ({shiftTime.start}:00-{shiftTime.end}:00)
                              </span>
                            </div>
                          )}
                          
                          {/* Статусы без времени */}
                          {shiftType && !shiftTime && (
                            <div className={`gantt-status shift-${shiftType}`}>
                              {shiftType === 'off' && 'Выходной'}
                              {shiftType === 'vacation' && 'Отпуск'}
                              {shiftType === 'sick' && 'Больничный'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Popup для выбора смены */}
        {popup.open && (
          <div className="popup-overlay" onClick={closePopup}>
            <div className="popup" onClick={(e) => e.stopPropagation()}>
              <h3>
                {bulkEditMode && selectedCells.size > 0 
                  ? `Выберите тип смены для ${selectedCells.size} ячеек` 
                  : 'Выберите тип смены'
                }
              </h3>
              <div className="shift-options">
                {Object.entries(settings.shiftTypes).map(([key, shiftType]) => (
                  <div key={key} className={`shift-option shift-${key}`} onClick={() => handleShiftChange(key)}>
                    {shiftType.label}{shiftType.time && <br />}{shiftType.time}
                  </div>
                ))}
                <div 
                  className="shift-option" 
                  style={{ background: '#fff', color: '#333', border: '2px solid #ddd' }}
                  onClick={() => handleShiftChange('clear')}
                >
                  Очистить
                </div>
              </div>
              <div className="popup-buttons">
                <button className="btn btn-cancel" onClick={closePopup}>Отмена</button>
              </div>
            </div>
          </div>
        )}

        {/* Модальное окно настроек */}
        {settingsModal && (
          <div className="settings-overlay" onClick={() => setSettingsModal(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
              <div className="settings-header">
                <h2>Настройки</h2>
                <button className="close-btn" onClick={() => setSettingsModal(false)}>×</button>
              </div>
              
              <div className="settings-content">
                <div className="settings-section">
                  <h3>Сотрудники</h3>
                  <div className="employees-list">
                    {settings.employees.map((employee, index) => (
                      <div key={index} className="employee-item">
                        <input 
                          type="text" 
                          value={employee}
                          onChange={(e) => handleEmployeeChange(index, e.target.value)}
                        />
                        <button 
                          className="remove-btn"
                          onClick={() => handleRemoveEmployee(index)}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="add-btn"
                    onClick={handleAddEmployee}
                  >
                    + Добавить сотрудника
                  </button>
                </div>

                <div className="settings-section">
                  <h3>Типы смен</h3>
                  <div className="shift-types-list">
                    {Object.entries(settings.shiftTypes).map(([key, shiftType]) => (
                      <div key={key} className="shift-type-item">
                        <div className="shift-type-inputs">
                          <input 
                            type="text" 
                            placeholder="Название"
                            value={shiftType.label}
                            onChange={(e) => handleShiftTypeChange(key, 'label', e.target.value)}
                          />
                          <input 
                            type="text" 
                            placeholder="Краткое"
                            value={shiftType.shortLabel}
                            maxLength={2}
                            onChange={(e) => handleShiftTypeChange(key, 'shortLabel', e.target.value)}
                          />
                          {shiftType.start !== null && (
                            <>
                              <input 
                                type="number" 
                                placeholder="Начало"
                                min="0" max="23"
                                value={shiftType.start}
                                onChange={(e) => handleShiftTypeChange(key, 'start', parseInt(e.target.value))}
                              />
                              <input 
                                type="number" 
                                placeholder="Конец"
                                min="0" max="24"
                                value={shiftType.end}
                                onChange={(e) => handleShiftTypeChange(key, 'end', parseInt(e.target.value))}
                              />
                            </>
                          )}
                        </div>
                        <button 
                          className="remove-btn"
                          onClick={() => handleRemoveShiftType(key)}
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

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
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            websocket: { ...prev.websocket, enabled: e.target.checked }
                          }));
                        }}
                      />
                      Включить real-time синхронизацию
                    </label>
                    
                    <input 
                      type="password"
                      placeholder="Ably API Key (например: abc123.def456:xyz789)"
                      value={settings.websocket.apiKey}
                      onChange={(e) => {
                        setSettings(prev => ({
                          ...prev,
                          websocket: { ...prev.websocket, apiKey: e.target.value }
                        }));
                      }}
                      disabled={!settings.websocket.enabled}
                    />
                    
                    <input 
                      type="text"
                      placeholder="Room ID (например: simple-scheduler-mv)"
                      value={settings.websocket.roomId}
                      onChange={(e) => {
                        setSettings(prev => ({
                          ...prev,
                          websocket: { ...prev.websocket, roomId: e.target.value }
                        }));
                      }}
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
                        onClick={() => {
                          const testMessage = {
                            test: true,
                            timestamp: new Date().toISOString(),
                            userId: myClientId.current
                          };
                          debugLog('🧪 Отправляем тестовое сообщение');
                          channel.current.publish('test-message', testMessage);
                        }}
                        style={{ marginTop: '10px' }}
                      >
                        🧪 Тест отправки сообщения
                      </button>
                    )}
                  </div>
                </div>

                <div className="settings-section">
                  <h3>Отладка</h3>
                  <div className="debug-settings">
                    <label>
                      <input 
                        type="checkbox"
                        checked={settings.debug}
                        onChange={(e) => {
                          setSettings(prev => ({
                            ...prev,
                            debug: e.target.checked
                          }));
                        }}
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
              </div>
              
              <div className="settings-footer">
                <button className="btn btn-cancel" onClick={() => setSettingsModal(false)}>
                  Отмена
                </button>
                <button className="btn btn-primary" onClick={() => setSettingsModal(false)}>
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
