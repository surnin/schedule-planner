import React, { useState, useEffect } from 'react';
import './App.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// FontAwesome setup
import { library } from '@fortawesome/fontawesome-svg-core';
import { faTelegram } from '@fortawesome/free-brands-svg-icons';
import { faDownload, faCog, faLock, faLockOpen, faChevronLeft, faChevronRight, faCalendarDays } from '@fortawesome/free-solid-svg-icons';

// Add icons to the library
library.add(faTelegram, faDownload, faCog, faLock, faLockOpen, faChevronLeft, faChevronRight, faCalendarDays);

import { useLocalStorage } from './hooks/useLocalStorage';
import { useAblyConnection } from './hooks/useAblyConnection';
import { useScheduleLogic } from './hooks/useScheduleLogic';
import { useEmployeeManagement } from './hooks/useEmployeeManagement';
import { useShiftManagement } from './hooks/useShiftManagement';
import { defaultEmployees, defaultShiftTypes, initialData, defaultTags, defaultWorkingHours, defaultPositions } from './constants/defaultData';

import Header from './components/Header';
import Legend from './components/Legend';
import GridView from './components/GridView';
import TimelineView from './components/TimelineView';
import SettingsModal from './components/SettingsModal';
import ShiftAndTagPopup from './components/ShiftAndTagPopup';
import FlexibleTimeModal from './components/FlexibleTimeModal';
import AuthModal from './components/AuthModal';
import CalendarNavigation from './components/CalendarNavigation';

function App() {
  // Settings state
  const [settings, setSettings] = useLocalStorage('schedule-planner-settings', {
    employees: defaultEmployees,
    positions: defaultPositions,
    shiftTypes: defaultShiftTypes,
    tags: defaultTags,
    workingHours: defaultWorkingHours,
    websocket: {
      url: '',
      apiKey: '',
      roomId: '',
      enabled: false
    },
    telegram: {
      enabled: false,
      botToken: '',
      chatId: ''
    },
    admins: [],
    debug: false
  });

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useLocalStorage('schedule-planner-auth', true);
  const [authModal, setAuthModal] = useState(false);

  // UI state
  const [popup, setPopup] = useState({ open: false, empIndex: null, dayIndex: null, selectedTags: [] });
  const [settingsModal, setSettingsModal] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [flexibleTimeModal, setFlexibleTimeModal] = useState({ open: false, empIndex: null, dayIndex: null });

  // Settings update handler
  const handleSettingsUpdate = (newSettings) => {
    setSettings(prev => {
      const updatedSettings = {
        ...prev,
        employees: newSettings.employees !== undefined ? newSettings.employees : prev.employees,
        positions: newSettings.positions !== undefined ? newSettings.positions : prev.positions,
        shiftTypes: newSettings.shiftTypes !== undefined ? newSettings.shiftTypes : prev.shiftTypes,
        tags: newSettings.tags !== undefined ? newSettings.tags : prev.tags,
        admins: newSettings.admins !== undefined ? newSettings.admins : (prev.admins || []),
        websocket: newSettings.websocket !== undefined ? newSettings.websocket : prev.websocket,
        telegram: newSettings.telegram !== undefined ? newSettings.telegram : prev.telegram,
        debug: newSettings.debug !== undefined ? newSettings.debug : (prev.debug || false),
        workingHours: newSettings.workingHours !== undefined ? newSettings.workingHours : prev.workingHours
      };
      
      if (newSettings.admins !== undefined && JSON.stringify(newSettings.admins) !== JSON.stringify(prev.admins || [])) {
        setIsAuthenticated(false);
      }
      
      return updatedSettings;
    });
  };

  // Initialize Ably connection first to get publishers
  const handleAuthStateUpdate = (isAuthenticated, admins) => {
    if (admins && admins.length > 0) {
      setSettings(prev => ({
        ...prev,
        admins: admins
      }));
    }
    setIsAuthenticated(isAuthenticated);
  };

  // Temporary state for initial Ably connection
  const [tempSchedule] = useState({});
  const [tempCellTags] = useState({});

  const {
    connectionState,
    onlineUsers,
    publishScheduleUpdate,
    publishSettingsUpdate,
    publishCellTagsUpdate,
    publishAuthStateUpdate,
    sendTestMessage,
    sendPushNotification,
    requestExistingData
  } = useAblyConnection(
    settings,
    tempSchedule,
    tempCellTags,
    () => {}, // Temporary handlers
    handleSettingsUpdate,
    () => {},
    handleAuthStateUpdate
  );

  // Initialize custom hooks with publishers
  const scheduleLogic = useScheduleLogic(settings, publishScheduleUpdate, publishCellTagsUpdate);
  const employeeManagement = useEmployeeManagement(settings, handleSettingsUpdate);
  const shiftManagement = useShiftManagement(settings, handleSettingsUpdate, publishCellTagsUpdate);

  // Use hooks data and functions instead of local ones
  const {
    schedule,
    currentView,
    selectedDay,
    currentStartDate,
    viewPeriod,
    flexibleShifts,
    cellTags,
    setCurrentView,
    setSelectedDay,
    setCurrentStartDate,
    setViewPeriod,
    getScheduleByDate,
    setScheduleByDate,
    getCellTagsByDate,
    setCellTagsByDate,
    getFlexibleShiftData,
    handleFlexibleTimeConfirm,
    generateDayLabels,
    getDayType,
    getDateKey,
    handleDateClick,
    handleViewSwitch,
    clearAllData
  } = scheduleLogic;

  const {
    selectedPosition,
    filteredEmployees,
    getFullEmployeeIndex,
    shouldShowEmployee,
    handleEmployeeChange,
    handleRemoveEmployee,
    handleAddEmployee,
    handlePositionChange,
    handleRemovePosition,
    handleAddPosition,
    handlePositionFilterChange
  } = employeeManagement;

  const {
    handleShiftTypeChange,
    handleRemoveShiftType,
    handleAddShiftType,
    handleWorkingHoursChange,
    getShiftDisplay
  } = shiftManagement;

  // REMOVE old function definitions that are now handled by hooks
  // const generateDayLabels = (startDate, days) => {
    try {
      const labels = [];
      const start = new Date(startDate);
      
      // Проверяем что дата валидна
      if (isNaN(start.getTime())) {
        // Invalid date fallback
        // Fallback на сегодняшнюю дату
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        return generateDayLabels(monday.toISOString().split('T')[0], days);
      }
      
      const dayNames = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
      const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 
                         'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
      
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        
        const dayName = dayNames[currentDate.getDay()];
        const dayNum = currentDate.getDate();
        const monthName = monthNames[currentDate.getMonth()];
        
        // Если дата в новом месяце, показываем месяц
        if (i === 0 || currentDate.getDate() === 1) {
          labels.push(`${dayName} ${dayNum} ${monthName}`);
        } else {
          labels.push(`${dayName} ${dayNum}`);
        }
      }
      return labels;
    } catch (error) {
      // Error fallback
      // Fallback на сегодняшнюю дату
      const today = new Date();
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      return generateDayLabels(monday.toISOString().split('T')[0], days);
    }
  };

  // Функция для определения типа дня (выходной, 1-е число)
  const getDayType = (dayIndex) => {
    try {
      const start = new Date(currentStartDate);
      if (isNaN(start.getTime())) return { isWeekend: false, isFirstOfMonth: false };
      
      const targetDate = new Date(start);
      targetDate.setDate(start.getDate() + dayIndex);
      
      const dayOfWeek = targetDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      const isFirstOfMonth = targetDate.getDate() === 1;
      
      return { isWeekend, isFirstOfMonth };
    } catch (error) {
      return { isWeekend: false, isFirstOfMonth: false };
    }
  };

  // Генерируем текущие dayLabels динамически
  const dynamicDayLabels = generateDayLabels(currentStartDate, viewPeriod);

  // Функции для конвертации между индексами и датами
  const getDateFromIndex = (dayIndex) => {
    try {
      const start = new Date(currentStartDate);
      // Проверяем что дата валидна
      if (isNaN(start.getTime())) {
        // Invalid date fallback
        // Возвращаем сегодняшнюю дату как fallback
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dayIndex);
        return targetDate.toISOString().split('T')[0];
      }
      
      const targetDate = new Date(start);
      targetDate.setDate(start.getDate() + dayIndex);
      return targetDate.toISOString().split('T')[0];
    } catch (error) {
      // Error fallback
      // Fallback на сегодняшнюю дату
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayIndex);
      return targetDate.toISOString().split('T')[0];
    }
  };

  // Функция для получения уникального идентификатора сотрудника
  const getEmployeeId = (empIndex) => {
    const employee = settings.employees[empIndex];
    if (!employee) return `emp-${empIndex}`;
    
    // Используем имя как уникальный идентификатор
    const empName = typeof employee === 'string' ? employee : employee.name;
    return empName;
  };

  // Внутренняя функция для создания ключа даты
  const getDateKeyInternal = (empIndex, dayIndex) => {
    const dateStr = getDateFromIndex(dayIndex);
    const employeeId = getEmployeeId(empIndex);
    return `${employeeId}-${dateStr}`;
  };

  // Функция для компонентов с отфильтрованными индексами
  const getDateKey = (filteredEmpIndex, dayIndex) => {
    const empIndex = getFullEmployeeIndex(filteredEmpIndex);
    return getDateKeyInternal(empIndex, dayIndex);
  };

  // Функция для получения расписания по дате (внутренняя)
  const getScheduleByDateInternal = (empIndex, dayIndex) => {
    const dateKey = getDateKeyInternal(empIndex, dayIndex);
    return schedule[dateKey];
  };

  // Функция для получения расписания по дате (для компонентов с отфильтрованными индексами)
  const getScheduleByDate = (filteredEmpIndex, dayIndex) => {
    const empIndex = getFullEmployeeIndex(filteredEmpIndex);
    return getScheduleByDateInternal(empIndex, dayIndex);
  };

  // Функция для установки расписания по дате
  const setScheduleByDate = (empIndex, dayIndex, shiftType) => {
    const dateKey = getDateKeyInternal(empIndex, dayIndex);
    setSchedule(prev => {
      const newSchedule = { ...prev };
      if (shiftType === 'clear' || !shiftType) {
        delete newSchedule[dateKey];
        // Также очищаем теги для этой ячейки
        setCellTags(prevTags => {
          const newTags = { ...prevTags };
          delete newTags[dateKey];
          publishCellTagsUpdate(newTags);
          return newTags;
        });
      } else {
        newSchedule[dateKey] = shiftType;
      }
      publishScheduleUpdate(newSchedule);
      return newSchedule;
    });
  };

  // Функции для работы с тегами по датам (внутренняя)
  const getCellTagsByDateInternal = (empIndex, dayIndex) => {
    const dateKey = getDateKeyInternal(empIndex, dayIndex);
    return cellTags[dateKey] || [];
  };

  // Функции для работы с тегами по датам (для компонентов с отфильтрованными индексами)
  const getCellTagsByDate = (filteredEmpIndex, dayIndex) => {
    const empIndex = getFullEmployeeIndex(filteredEmpIndex);
    return getCellTagsByDateInternal(empIndex, dayIndex);
  };

  const setCellTagsByDate = (empIndex, dayIndex, tags) => {
    const dateKey = getDateKeyInternal(empIndex, dayIndex);
    setCellTags(prev => {
      const newCellTags = { ...prev };
      if (!tags || tags.length === 0) {
        delete newCellTags[dateKey];
      } else {
        newCellTags[dateKey] = tags;
      }
      publishCellTagsUpdate(newCellTags);
      return newCellTags;
    });
  };

  // Функция для фильтрации сотрудников по должности
  const getFilteredEmployees = () => {
    if (selectedPosition === 'all') {
      return settings.employees;
    }
    return settings.employees.filter(emp => {
      const empPosition = typeof emp === 'string' ? '' : emp.position;
      return empPosition === selectedPosition;
    });
  };

  // Функция для получения индекса в полном списке по индексу в отфильтрованном
  const getFullEmployeeIndex = (filteredIndex) => {
    if (selectedPosition === 'all') {
      return filteredIndex;
    }
    
    const filteredEmployees = getFilteredEmployees();
    const targetEmployee = filteredEmployees[filteredIndex];
    if (!targetEmployee) return filteredIndex;
    
    const targetName = typeof targetEmployee === 'string' ? targetEmployee : targetEmployee.name;
    
    return settings.employees.findIndex(emp => {
      const empName = typeof emp === 'string' ? emp : emp.name;
      return empName === targetName;
    });
  };

  // Обновляем стили при изменении типов смен
  useEffect(() => {
    injectShiftStyles(settings.shiftTypes);
  }, [settings.shiftTypes]);

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

  const handleEmployeeChange = (index, field, value) => {
    const newEmployees = [...settings.employees];
    if (field === 'name') {
      const currentEmployee = typeof newEmployees[index] === 'string' 
        ? { name: newEmployees[index], position: '' }
        : newEmployees[index];
      newEmployees[index] = { ...currentEmployee, name: value };
    } else if (field === 'position') {
      const currentEmployee = typeof newEmployees[index] === 'string' 
        ? { name: newEmployees[index], position: '' }
        : newEmployees[index];
      newEmployees[index] = { ...currentEmployee, position: value };
    } else {
      // Обратная совместимость для старого формата
      newEmployees[index] = value;
    }
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
      employees: [...settings.employees, { name: 'Новый сотрудник', position: '' }] 
    };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handlePositionChange = (index, value) => {
    const newPositions = [...settings.positions];
    newPositions[index] = value;
    const newSettings = { ...settings, positions: newPositions };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleRemovePosition = (index) => {
    const newPositions = settings.positions.filter((_, i) => i !== index);
    const newSettings = { ...settings, positions: newPositions };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleAddPosition = () => {
    const newSettings = { 
      ...settings, 
      positions: [...(settings.positions || []), 'Новая должность'] 
    };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleShiftTypeChange = (key, field, value) => {
    const newShiftTypes = {
      ...settings.shiftTypes,
      [key]: { ...settings.shiftTypes[key] }
    };
    
    if (field === 'startTime') {
      newShiftTypes[key].start = value.hours;
      newShiftTypes[key].startMinutes = value.minutes;
    } else if (field === 'endTime') {
      newShiftTypes[key].end = value.hours;
      newShiftTypes[key].endMinutes = value.minutes;
    } else {
      newShiftTypes[key][field] = value;
    }
    
    // Обновляем строку времени если есть и начало и конец
    if (newShiftTypes[key].start !== null && newShiftTypes[key].end !== null) {
      const startMinutes = newShiftTypes[key].startMinutes || 0;
      const endMinutes = newShiftTypes[key].endMinutes || 0;
      const startTime = `${newShiftTypes[key].start.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
      const endTime = `${newShiftTypes[key].end.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      newShiftTypes[key].time = `${startTime}-${endTime}`;
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

  const handleAddShiftType = () => {
    const newKey = `custom_${Date.now()}`;
    const newShiftType = {
      label: 'Новая смена',
      shortLabel: 'Н',
      start: 9,
      startMinutes: 0,
      end: 17,
      endMinutes: 0,
      time: '9:00-17:00',
      color: '#4CAF50'
    };
    
    const newShiftTypes = {
      ...settings.shiftTypes,
      [newKey]: newShiftType
    };
    
    const newSettings = { ...settings, shiftTypes: newShiftTypes };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleShiftChange = (shiftType) => {
    let newSchedule;
    
    if (bulkEditMode && selectedCells.size > 0) {
      setSchedule(prev => {
        newSchedule = { ...prev };
        selectedCells.forEach(cellKey => {
          if (shiftType === 'clear') {
            delete newSchedule[cellKey];
          } else {
            newSchedule[cellKey] = shiftType;
          }
        });
        publishScheduleUpdate(newSchedule);
        return newSchedule;
      });
      
      // Также очищаем теги для выделенных ячеек при очистке
      if (shiftType === 'clear') {
        setCellTags(prevTags => {
          const newTags = { ...prevTags };
          selectedCells.forEach(cellKey => {
            delete newTags[cellKey];
          });
          publishCellTagsUpdate(newTags);
          return newTags;
        });
      }
      
      setSelectedCells(new Set());
    } else {
      if (popup.empIndex === null || popup.dayIndex === null) return;
      
      // Используем новую систему с датами
      setScheduleByDate(popup.empIndex, popup.dayIndex, shiftType);
    }
    
    setPopup({ open: false, empIndex: null, dayIndex: null });
  };

  const handleFlexibleShiftClick = () => {
    // Открываем модальное окно для выбора времени
    setFlexibleTimeModal({ 
      open: true, 
      empIndex: popup.empIndex, 
      dayIndex: popup.dayIndex 
    });
    setPopup({ open: false, empIndex: null, dayIndex: null });
  };

  const handleFlexibleTimeConfirm = (startTime, endTime) => {
    const { empIndex, dayIndex } = flexibleTimeModal;
    if (empIndex === null || dayIndex === null) return;

    // Сохраняем гибкую смену
    const flexibleKey = `${empIndex}-${dayIndex}`;
    const newFlexibleShifts = {
      ...flexibleShifts,
      [flexibleKey]: {
        start: startTime.hours,
        startMinutes: startTime.minutes || 0,
        end: endTime.hours,
        endMinutes: endTime.minutes || 0,
        empIndex,
        dayIndex
      }
    };
    setFlexibleShifts(newFlexibleShifts);

    // Устанавливаем тип смены как flexible
    setScheduleByDate(empIndex, dayIndex, 'flexible');
    
    setFlexibleTimeModal({ open: false, empIndex: null, dayIndex: null });
  };

  const getFlexibleShiftData = (filteredEmpIndex, dayIndex) => {
    const empIndex = getFullEmployeeIndex(filteredEmpIndex);
    const flexibleKey = `${empIndex}-${dayIndex}`;
    return flexibleShifts[flexibleKey];
  };

  const handleCellClick = (filteredEmpIndex, dayIndex) => {
    // Проверяем авторизацию
    if (!checkAuthentication()) {
      alert('Редактирование заблокировано. Войдите как администратор для редактирования расписания.');
      return;
    }

    // Преобразуем отфильтрованный индекс в полный индекс
    const empIndex = getFullEmployeeIndex(filteredEmpIndex);

    if (bulkEditMode) {
      const dateKey = getDateKeyInternal(empIndex, dayIndex);
      setSelectedCells(prev => {
        const newSet = new Set(prev);
        if (newSet.has(dateKey)) {
          newSet.delete(dateKey);
        } else {
          newSet.add(dateKey);
        }
        return newSet;
      });
    } else {
      const currentTags = getCellTagsByDateInternal(empIndex, dayIndex);
      setPopup({ open: true, empIndex, dayIndex, selectedTags: currentTags });
    }
  };

  const handleCellRightClick = (event) => {
    if (bulkEditMode && selectedCells.size > 0) {
      event.preventDefault();
      // Найдем общие теги для всех выбранных ячеек
      const selectedCellsArray = Array.from(selectedCells);
      const commonTags = selectedCellsArray.length > 0 ? 
        (cellTags[selectedCellsArray[0]] || []).filter(tag => 
          selectedCellsArray.every(cellKey => (cellTags[cellKey] || []).includes(tag))
        ) : [];
      
      setPopup({ open: true, empIndex: null, dayIndex: null, selectedTags: commonTags });
    }
  };

  const handleDateClick = (dayIndex) => {
    setSelectedDay(dayIndex);
    setCurrentView('timeline');
  };

  const handleViewSwitch = (view) => {
    if (view === 'timeline' && selectedDay === null) {
      // Автоматически выбираем первый день при переходе в timeline
      setSelectedDay(0);
    }
    setCurrentView(view);
  };

  const shouldShowEmployee = (empIndex) => {
    // Показываем всех сотрудников (фильтр удален)
    return true;
  };

  const toggleBulkEdit = () => {
    // Проверяем авторизацию
    if (!checkAuthentication()) {
      alert('Редактирование заблокировано. Войдите как администратор для редактирования расписания.');
      return;
    }

    setBulkEditMode(!bulkEditMode);
    setSelectedCells(new Set());
  };

  const exportData = () => {
    const data = {
      schedule,
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
          publishScheduleUpdate(data.schedule);
        }
        if (data.currentView) setCurrentView(data.currentView);
        if (data.selectedDay !== undefined) setSelectedDay(data.selectedDay);
        
        alert('Данные успешно импортированы!');
      } catch (error) {
        alert('Ошибка при импорте данных. Проверьте формат файла.');
        // Import error
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Функции управления администраторами
  const handleAdminChange = (index, field, value) => {
    const currentAdmins = settings.admins || [];
    
    if (index >= currentAdmins.length) {
      return;
    }
    
    const newAdmins = [...currentAdmins];
    newAdmins[index] = { ...newAdmins[index], [field]: value };
    const newSettings = { ...settings, admins: newAdmins };
    
    localStorage.setItem('schedule-planner-settings', JSON.stringify(newSettings));
    
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
    publishAuthStateUpdate(isAuthenticated, newAdmins);
  };

  const handleRemoveAdmin = (index) => {
    const newAdmins = settings.admins.filter((_, i) => i !== index);
    const newSettings = { ...settings, admins: newAdmins };
    
    localStorage.setItem('schedule-planner-settings', JSON.stringify(newSettings));
    
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
    publishAuthStateUpdate(isAuthenticated, newAdmins);
  };

  const handleAddAdmin = () => {
    const newAdmin = {
      name: 'Новый администратор',
      password: ''
    };
    const currentAdmins = settings.admins || [];
    const newAdmins = [...currentAdmins, newAdmin];
    const newSettings = { ...settings, admins: newAdmins };
    
    localStorage.setItem('schedule-planner-settings', JSON.stringify(newSettings));
    
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
    publishAuthStateUpdate(isAuthenticated, newAdmins);
  };

  // Проверка авторизации
  const checkAuthentication = () => {
    // Если нет администраторов, разрешаем редактирование всем
    if (!settings.admins || settings.admins.length === 0) {
      return true;
    }
    return isAuthenticated;
  };

  // Функция разблокировки редактирования
  const handleUnlock = () => {
    if (!settings.admins || settings.admins.length === 0) {
      setIsAuthenticated(true);
      return;
    }
    setAuthModal(true);
  };

  // Функция блокировки редактирования
  const handleLock = () => {
    setIsAuthenticated(false);
    publishAuthStateUpdate(false, settings.admins || []);
  };

  const clearAllData = () => {
    // Проверяем авторизацию
    if (!checkAuthentication()) {
      alert('Очистка данных заблокирована. Войдите как администратор для доступа к этой функции.');
      return;
    }

    if (confirm('Вы уверены, что хотите очистить все данные? Это действие нельзя отменить.')) {
      const emptySchedule = {};
      const emptyCellTags = {};
      
      setSchedule(emptySchedule);
      setCellTags(emptyCellTags);
      publishScheduleUpdate(emptySchedule);
      publishCellTagsUpdate(emptyCellTags);
      
      setCurrentView('grid');
      setSelectedDay(null);
      setBulkEditMode(false);
      setSelectedCells(new Set());
      
      alert('Все данные очищены!');
    }
  };

  const handleSettingsChange = (path, value) => {
    const pathArray = path.split('.');
    setSettings(prev => {
      const newSettings = { ...prev };
      let current = newSettings;
      
      for (let i = 0; i < pathArray.length - 1; i++) {
        current[pathArray[i]] = { ...current[pathArray[i]] };
        current = current[pathArray[i]];
      }
      
      current[pathArray[pathArray.length - 1]] = value;
      return newSettings;
    });
  };

  // Функции управления тегами
  const handleTagChange = (key, field, value) => {
    const updatedTag = { ...settings.tags[key], [field]: value };
    
    // Если изменяется название (label), автоматически обновляем символ (shortLabel)
    if (field === 'label') {
      updatedTag.shortLabel = value;
    }
    
    const newTags = {
      ...settings.tags,
      [key]: updatedTag
    };
    const newSettings = { ...settings, tags: newTags };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleRemoveTag = (key) => {
    const newTags = { ...settings.tags };
    delete newTags[key];
    const newSettings = { ...settings, tags: newTags };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleAddTag = () => {
    const newKey = `tag_${Date.now()}`;
    const newTag = {
      label: 'Новый тег',
      shortLabel: 'Новый тег',
      color: '#4CAF50'
    };
    
    const newTags = {
      ...settings.tags,
      [newKey]: newTag
    };
    
    const newSettings = { ...settings, tags: newTags };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleTagToggle = (tagKey) => {
    setPopup(prev => {
      const newSelectedTags = prev.selectedTags.includes(tagKey)
        ? prev.selectedTags.filter(t => t !== tagKey)
        : [...prev.selectedTags, tagKey];
      
      // Обновляем теги ячейки для обычного режима
      if (prev.empIndex !== null && prev.dayIndex !== null) {
        setCellTagsByDate(prev.empIndex, prev.dayIndex, newSelectedTags);
      }
      // Обновляем теги для всех выбранных ячеек в bulk режиме  
      else if (bulkEditMode && selectedCells.size > 0) {
        setCellTags(prevCellTags => {
          const newCellTags = { ...prevCellTags };
          const isAdding = !prev.selectedTags.includes(tagKey);
          
          selectedCells.forEach(cellKey => {
            const currentCellTags = newCellTags[cellKey] || [];
            if (isAdding) {
              // Добавляем тег, если его нет
              if (!currentCellTags.includes(tagKey)) {
                newCellTags[cellKey] = [...currentCellTags, tagKey];
              }
            } else {
              // Удаляем тег
              newCellTags[cellKey] = currentCellTags.filter(t => t !== tagKey);
            }
          });
          
          publishCellTagsUpdate(newCellTags);
          return newCellTags;
        });
      }
      
      return {
        ...prev,
        selectedTags: newSelectedTags
      };
    });
  };

  const handleCellTagsChange = (cellKey, newTags) => {
    setCellTags(prev => {
      const newCellTags = {
        ...prev,
        [cellKey]: newTags
      };
      publishCellTagsUpdate(newCellTags);
      return newCellTags;
    });
  };

  const handleTagClick = (empIndex, dayIndex) => {
    // Проверяем авторизацию
    if (!checkAuthentication()) {
      alert('Редактирование заблокировано. Войдите как администратор для редактирования расписания.');
      return;
    }

    const currentTags = getCellTagsByDate(empIndex, dayIndex);
    setPopup({ open: true, empIndex, dayIndex, selectedTags: currentTags });
  };

  // Функция для отправки Push уведомлений
  const sendPushNotification = (title, message) => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/icon.svg',
          tag: 'schedule-update',
          badge: '/icon32.png'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, {
              body: message,
              icon: '/icon.svg',
              tag: 'schedule-update',
              badge: 'icons/icon32.png'
            });
          }
        });
      }
    }
  };

  // Функция для генерации PDF расписания
  const generateSchedulePDF = async () => {
    try {
      
      // Создаем временный элемент для PDF
      const scheduleElement = document.querySelector('.schedule-grid');
      if (!scheduleElement) {
        throw new Error('Не удалось найти элемент расписания');
      }

      // Создаем клон элемента для стилизации под PDF
      const clonedElement = scheduleElement.cloneNode(true);
      
      // Оптимизируем стили для PDF
      clonedElement.style.cssText = `
        width: 100%;
        background: white;
        border: 1px solid #ddd;
        border-radius: 0;
        box-shadow: none;
        font-family: Arial, sans-serif;
        font-size: 12px;
      `;

      // Добавляем заголовок с дополнительной информацией
      const currentDate = new Date();
      const firstDay = dynamicDayLabels[0] || 'пн';
      const lastDay = dynamicDayLabels[dynamicDayLabels.length - 1] || 'вс';
      
      const titleElement = document.createElement('div');
      titleElement.style.cssText = `
        font-size: 20px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 15px;
        color: #333;
        font-family: Arial, sans-serif;
        border-bottom: 2px solid #667eea;
        padding-bottom: 10px;
      `;
      titleElement.innerHTML = `
        📅 Расписание смен<br>
        <span style="font-size: 16px; color: #667eea; font-weight: 600;">
          ${firstDay} — ${lastDay}
        </span><br>
        <small style="font-size: 12px; color: #666;">
          Создано: ${currentDate.toLocaleDateString('ru-RU')} в ${currentDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </small>
      `;

      // Добавляем информацию о сотрудниках
      const statsElement = document.createElement('div');
      statsElement.style.cssText = `
        font-size: 12px;
        color: #666;
        margin-bottom: 15px;
        text-align: center;
        font-family: Arial, sans-serif;
      `;
      const totalEmployees = settings.employees.length;
      const employeesWithSchedule = settings.employees.filter((_, index) => 
        Object.keys(schedule).some(key => key.startsWith(`${index}-`))
      ).length;
      statsElement.textContent = `Всего сотрудников: ${totalEmployees} | С расписанием: ${employeesWithSchedule}`;

      // Создаем контейнер для PDF
      const pdfContainer = document.createElement('div');
      pdfContainer.style.cssText = `
        position: absolute;
        top: -10000px;
        left: -10000px;
        width: 1200px;
        background: white;
        padding: 20px;
        font-family: Arial, sans-serif;
      `;
      
      pdfContainer.appendChild(titleElement);
      pdfContainer.appendChild(statsElement);
      pdfContainer.appendChild(clonedElement);
      document.body.appendChild(pdfContainer);


      // Генерируем изображение из HTML с оптимизированными настройками
      const canvas = await html2canvas(pdfContainer, {
        scale: 1.5, // Снижаем scale для ускорения
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 1240,
        height: Math.max(600, pdfContainer.scrollHeight + 40),
        logging: false, // Отключаем логирование для ускорения
        allowTaint: true
      });

      // Удаляем временный элемент
      document.body.removeChild(pdfContainer);


      // Создаем PDF
      const pdf = new jsPDF('l', 'mm', 'a4'); // landscape orientation
      
      const imgData = canvas.toDataURL('image/jpeg', 0.85); // Используем JPEG с качеством 85% для меньшего размера
      const imgWidth = 290; // A4 landscape width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Проверяем, нужно ли разбить на несколько страниц
      const pageHeight = 200; // Максимальная высота на странице
      
      if (imgHeight <= pageHeight) {
        // Помещается на одну страницу
        pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
      } else {
        // Разбиваем на несколько страниц
        let yPosition = 0;
        const sourceHeight = canvas.height;
        const pageHeightInPixels = (pageHeight * canvas.width) / imgWidth;
        
        while (yPosition < sourceHeight) {
          const remainingHeight = sourceHeight - yPosition;
          const currentPageHeight = Math.min(pageHeightInPixels, remainingHeight);
          const currentPageHeightMM = (currentPageHeight * imgWidth) / canvas.width;
          
          if (yPosition > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(
            imgData, 
            'JPEG', 
            10, 
            10, 
            imgWidth, 
            currentPageHeightMM,
            undefined,
            'FAST',
            0,
            -yPosition * imgWidth / canvas.width
          );
          
          yPosition += currentPageHeight;
        }
      }
      
      
      // Возвращаем PDF как blob для отправки
      return pdf.output('blob');
    } catch (error) {
      throw error;
    }
  };

  // Функция для отправки PDF в Telegram
  const sendPDFToTelegram = async (pdfBlob) => {
    if (!settings.telegram?.enabled || !settings.telegram?.botToken || !settings.telegram?.chatId) {
      return false;
    }

    try {
      const formData = new FormData();
      const fileName = `schedule-${new Date().toISOString().split('T')[0]}.pdf`;
      const currentDate = new Date().toLocaleDateString('ru-RU');
      const currentTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      formData.append('chat_id', settings.telegram.chatId);
      formData.append('document', pdfBlob, fileName);
      formData.append('caption', `📊 <b>Расписание смен</b>\n📅 Дата: ${currentDate}\n🕐 Время: ${currentTime}`);
      formData.append('parse_mode', 'HTML');
      formData.append('disable_content_type_detection', 'false'); // Позволяет Telegram определить тип файла для превью

      const url = `https://api.telegram.org/bot${settings.telegram.botToken}/sendDocument`;
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (result.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  // Функция для отправки сообщения в Telegram
  const sendTelegramMessage = async (message) => {
    if (!settings.telegram?.enabled || !settings.telegram?.botToken || !settings.telegram?.chatId) {
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${settings.telegram.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: settings.telegram.chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      const result = await response.json();
      
      if (result.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  };

  // Обработчик кнопки "Опубликовать"
  const handlePublish = async () => {
    try {
      
      // Отправляем текущее расписание
      publishScheduleUpdate(schedule);
      publishCellTagsUpdate(cellTags);
      
      // Отправляем Push уведомление через WebSocket и локально
      const notificationTitle = 'Расписание обновлено!';
      const notificationMessage = 'Изменения в графике работы опубликованы.';
      
      // Локальное уведомление
      sendPushNotification(notificationTitle, notificationMessage);
      
      // WebSocket уведомление для других пользователей
      if (settings.websocket.enabled && connectionState === 'connected') {
        sendWebSocketPushNotification(notificationTitle, notificationMessage);
      }
      
      // Отправляем уведомление и PDF в Telegram
      if (settings.telegram?.enabled) {
        
        // Сначала отправляем PDF (более быстрый способ)
        let pdfSent = false;
        try {
          const pdfBlob = await generateSchedulePDF();
          pdfSent = await sendPDFToTelegram(pdfBlob);
        } catch (pdfError) {
          // PDF generation/send error
        }
        
        // Затем отправляем дополнительное текстовое сообщение (если нужно)
        let messageSent = true; // PDF уже содержит всю нужную информацию
        
        if (pdfSent) {
          alert('✅ Расписание успешно опубликовано!\n📊 PDF с превью отправлен в Telegram.');
        } else {
          // Отправляем хотя бы текстовое уведомление
          const currentDate = new Date().toLocaleDateString('ru-RU');
          const currentTime = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          const fallbackMessage = `📢 <b>Обновление расписания</b>\n\n` +
                                 `Изменения в графике работы опубликованы.\n` +
                                 `📅 ${currentDate} в ${currentTime}\n\n` +
                                 `⚠️ PDF не удалось отправить - проверьте расписание в приложении.`;
          
          messageSent = await sendTelegramMessage(fallbackMessage);
          
          if (messageSent) {
            alert('⚠️ Расписание опубликовано!\nТекстовое уведомление отправлено, но PDF не удалось создать.');
          } else {
            alert('❌ Расписание опубликовано локально!\nОшибка отправки в Telegram - проверьте настройки.');
          }
        }
      } else {
        alert('✅ Расписание успешно опубликовано!');
      }
    } catch (error) {
      alert('❌ Ошибка при публикации расписания. Попробуйте еще раз.');
    }
  };

  // Функция для скачивания PDF
  const downloadPDF = async () => {
    try {
      const pdfBlob = await generateSchedulePDF();
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `schedule-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Ошибка при создании PDF файла. Попробуйте еще раз.');
    }
  };

  return (
    <div className="container">
      <Header 
        currentView={currentView}
        selectedDay={selectedDay}
        bulkEditMode={bulkEditMode}
        dropdownOpen={dropdownOpen}
        connectionState={connectionState}
        onlineUsers={onlineUsers}
        websocketEnabled={settings.websocket.enabled}
        onViewSwitch={handleViewSwitch}
        onBulkEditToggle={toggleBulkEdit}
        onSettingsOpen={() => {
          if (!checkAuthentication()) {
            alert('Настройки заблокированы. Войдите как администратор для доступа к настройкам.');
            return;
          }
          setSettingsModal(true);
        }}
        onExportData={exportData}
        onImportData={importData}
        onClearAllData={clearAllData}
        onDropdownToggle={() => setDropdownOpen(!dropdownOpen)}
        onPublish={handlePublish}
        onDownloadPDF={downloadPDF}
        onUnlock={handleUnlock}
        onLock={handleLock}
        isAuthenticated={checkAuthentication()}
        hasAdmins={settings.admins && settings.admins.length > 0}
        dayLabels={dynamicDayLabels}
      />
      
      <div className="content">
        <CalendarNavigation 
          currentStartDate={currentStartDate}
          viewPeriod={viewPeriod}
          onStartDateChange={setCurrentStartDate}
          dynamicDayLabels={dynamicDayLabels}
          positions={settings.positions}
          selectedPosition={selectedPosition}
          onPositionChange={setSelectedPosition}
        />
        
{/* <Legend 
          shiftTypes={settings.shiftTypes}
        /> */}

        {currentView === 'grid' && (
          <GridView 
            employees={getFilteredEmployees()}
            schedule={schedule}
            shiftTypes={settings.shiftTypes}
            selectedCells={selectedCells}
            bulkEditMode={bulkEditMode}
            cellTags={cellTags}
            tags={settings.tags}
            dayLabels={dynamicDayLabels}
            viewPeriod={viewPeriod}
            getScheduleByDate={getScheduleByDate}
            getCellTagsByDate={getCellTagsByDate}
            getDateKey={getDateKey}
            onCellClick={handleCellClick}
            onCellRightClick={handleCellRightClick}
            onDateClick={handleDateClick}
            shouldShowEmployee={shouldShowEmployee}
            getDayType={getDayType}
            cellViewSettings={settings.cellView}
            getFlexibleShiftData={getFlexibleShiftData}
            onFlexibleTimeUpdate={(filteredEmpIndex, dayIndex, timeData) => {
              const empIndex = getFullEmployeeIndex(filteredEmpIndex);
              const flexibleKey = `${empIndex}-${dayIndex}`;
              setFlexibleShifts(prev => ({
                ...prev,
                [flexibleKey]: {
                  ...timeData,
                  empIndex,
                  dayIndex
                }
              }));
            }}
          />
        )}


        {currentView === 'timeline' && selectedDay !== null && (
          <TimelineView 
            employees={getFilteredEmployees()}
            schedule={schedule}
            shiftTypes={settings.shiftTypes}
            selectedDay={selectedDay}
            cellTags={cellTags}
            tags={settings.tags}
            dayLabels={dynamicDayLabels}
            getScheduleByDate={getScheduleByDate}
            getCellTagsByDate={getCellTagsByDate}
            onBackToGrid={() => setCurrentView('grid')}
            onDaySelect={setSelectedDay}
            onTagClick={handleTagClick}
            shouldShowEmployee={shouldShowEmployee}
            getFlexibleShiftData={getFlexibleShiftData}
            onFlexibleShiftUpdate={(filteredEmpIndex, dayIndex, timeData) => {
              const empIndex = getFullEmployeeIndex(filteredEmpIndex);
              const flexibleKey = `${empIndex}-${dayIndex}`;
              setFlexibleShifts(prev => ({
                ...prev,
                [flexibleKey]: {
                  ...timeData,
                  empIndex,
                  dayIndex
                }
              }));
            }}
            workingHours={settings.workingHours}
          />
        )}

        <ShiftAndTagPopup 
          isOpen={popup.open}
          shiftTypes={settings.shiftTypes}
          availableTags={settings.tags}
          selectedTags={popup.selectedTags}
          selectedCells={selectedCells}
          bulkEditMode={bulkEditMode}
          onShiftChange={handleShiftChange}
          onFlexibleShiftClick={handleFlexibleShiftClick}
          onTagToggle={handleTagToggle}
          onClose={() => setPopup({ open: false, empIndex: null, dayIndex: null, selectedTags: [] })}
        />

        <FlexibleTimeModal
          isOpen={flexibleTimeModal.open}
          onClose={() => setFlexibleTimeModal({ open: false, empIndex: null, dayIndex: null })}
          onConfirm={handleFlexibleTimeConfirm}
        />

        <SettingsModal 
          isOpen={settingsModal}
          settings={settings}
          connectionState={connectionState}
          onClose={() => setSettingsModal(false)}
          onEmployeeChange={handleEmployeeChange}
          onRemoveEmployee={handleRemoveEmployee}
          onAddEmployee={handleAddEmployee}
          onPositionChange={handlePositionChange}
          onRemovePosition={handleRemovePosition}
          onAddPosition={handleAddPosition}
          onShiftTypeChange={handleShiftTypeChange}
          onRemoveShiftType={handleRemoveShiftType}
          onAddShiftType={handleAddShiftType}
          onTagChange={handleTagChange}
          onRemoveTag={handleRemoveTag}
          onAddTag={handleAddTag}
          onSettingsChange={handleSettingsChange}
          onSendTestMessage={sendTestMessage}
          onAdminChange={handleAdminChange}
          onRemoveAdmin={handleRemoveAdmin}
          onAddAdmin={handleAddAdmin}
        />

        <AuthModal 
          isOpen={authModal}
          admins={settings.admins || []}
          onClose={() => setAuthModal(false)}
          onSuccess={() => setIsAuthenticated(true)}
        />
      </div>
    </div>
  );
}

export default App;