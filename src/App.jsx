import React, { useState, useEffect } from 'react';
import './App.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// FontAwesome setup
import { library } from '@fortawesome/fontawesome-svg-core';
import { faTelegram } from '@fortawesome/free-brands-svg-icons';
import { faDownload, faCog, faLock, faLockOpen } from '@fortawesome/free-solid-svg-icons';

// Add icons to the library
library.add(faTelegram, faDownload, faCog, faLock, faLockOpen);

import { useLocalStorage } from './hooks/useLocalStorage';
import { useAblyConnection } from './hooks/useAblyConnection';
import { defaultEmployees, defaultShiftTypes, defaultFilters, initialData, defaultTags, dayLabels } from './constants/defaultData';
import { injectShiftStyles } from './utils/styleUtils';

import Header from './components/Header';
import Legend from './components/Legend';
import GridView from './components/GridView';
import TimelineView from './components/TimelineView';
import GanttView from './components/GanttView';
import SettingsModal from './components/SettingsModal';
import ShiftAndTagPopup from './components/ShiftAndTagPopup';
import AuthModal from './components/AuthModal';

function App() {
  const [settings, setSettings] = useLocalStorage('schedule-planner-settings', {
    employees: defaultEmployees,
    shiftTypes: defaultShiftTypes,
    tags: defaultTags,
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

  const [schedule, setSchedule] = useLocalStorage('schedule-planner-data', () => {
    const initial = {};
    settings.employees.forEach((emp, empIndex) => {
      for (let day = 0; day < 14; day++) {
        const key = `${empIndex}-${day}`;
        if (initialData[emp] && day < initialData[emp].length) {
          initial[key] = initialData[emp][day];
        }
      }
    });
    return initial;
  });

  const [currentView, setCurrentView] = useLocalStorage('schedule-planner-view', 'grid');
  const [selectedDay, setSelectedDay] = useLocalStorage('schedule-planner-selected-day', null);
  const [filters, setFilters] = useLocalStorage('schedule-planner-filters', defaultFilters);
  const [cellTags, setCellTags] = useLocalStorage('schedule-planner-tags', {});

  const [popup, setPopup] = useState({ open: false, empIndex: null, dayIndex: null, selectedTags: [] });
  const [settingsModal, setSettingsModal] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // По умолчанию разрешено редактирование
  const [authModal, setAuthModal] = useState(false);

  const handleScheduleUpdate = (newSchedule) => {
    setSchedule(newSchedule);
  };

  const handleSettingsUpdate = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      employees: newSettings.employees || prev.employees,
      shiftTypes: newSettings.shiftTypes || prev.shiftTypes,
      tags: newSettings.tags || prev.tags
    }));
  };

  const handleCellTagsUpdate = (newCellTags) => {
    setCellTags(newCellTags);
  };

  const { connectionState, onlineUsers, publishScheduleUpdate, publishSettingsUpdate, publishCellTagsUpdate, sendTestMessage, sendPushNotification: sendWebSocketPushNotification } = 
    useAblyConnection(settings, schedule, cellTags, handleScheduleUpdate, handleSettingsUpdate, handleCellTagsUpdate);

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
    
    if (field === 'start' || field === 'end' || field === 'startMinutes' || field === 'endMinutes') {
      const shiftType = newShiftTypes[key];
      if (shiftType.start !== null && shiftType.end !== null) {
        const startMinutes = shiftType.startMinutes || 0;
        const endMinutes = shiftType.endMinutes || 0;
        const startTime = `${shiftType.start.toString().padStart(2, '0')}:${startMinutes.toString().padStart(2, '0')}`;
        const endTime = `${shiftType.end.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
        newShiftTypes[key].time = `${startTime}-${endTime}`;
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
      setSelectedCells(new Set());
    } else {
      if (popup.empIndex === null || popup.dayIndex === null) return;
      
      const key = `${popup.empIndex}-${popup.dayIndex}`;
      setSchedule(prev => {
        newSchedule = { ...prev };
        if (shiftType === 'clear') {
          delete newSchedule[key];
        } else {
          newSchedule[key] = shiftType;
        }
        publishScheduleUpdate(newSchedule);
        return newSchedule;
      });
    }
    
    setPopup({ open: false, empIndex: null, dayIndex: null });
  };

  const handleCellClick = (empIndex, dayIndex) => {
    // Проверяем авторизацию
    if (!checkAuthentication()) {
      alert('Редактирование заблокировано. Войдите как администратор для редактирования расписания.');
      return;
    }

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
      const cellKey = `${empIndex}-${dayIndex}`;
      const currentTags = cellTags[cellKey] || [];
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
    setCurrentView('gantt');
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
      
      // Проверяем пустые ячейки (undefined или пустая строка)
      if ((!shiftType || shiftType === '') && filters.empty) return true;
      // Проверяем смены
      if (shiftType && shiftType !== '' && filters[shiftType]) return true;
    }
    return false;
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
    event.target.value = '';
  };

  // Функции управления администраторами
  const handleAdminChange = (index, field, value) => {
    const currentAdmins = settings.admins || [];
    const newAdmins = [...currentAdmins];
    newAdmins[index] = { ...newAdmins[index], [field]: value };
    const newSettings = { ...settings, admins: newAdmins };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleRemoveAdmin = (index) => {
    const newAdmins = settings.admins.filter((_, i) => i !== index);
    const newSettings = { ...settings, admins: newAdmins };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
  };

  const handleAddAdmin = () => {
    const newAdmin = {
      name: 'Новый администратор',
      password: ''
    };
    const currentAdmins = settings.admins || [];
    const newAdmins = [...currentAdmins, newAdmin];
    const newSettings = { ...settings, admins: newAdmins };
    setSettings(newSettings);
    publishSettingsUpdate(newSettings);
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
  };

  const clearAllData = () => {
    if (confirm('Вы уверены, что хотите очистить все данные? Это действие нельзя отменить.')) {
      const emptySchedule = {};
      const emptyCellTags = {};
      
      setSchedule(emptySchedule);
      setCellTags(emptyCellTags);
      publishScheduleUpdate(emptySchedule);
      publishCellTagsUpdate(emptyCellTags);
      
      setFilters(defaultFilters);
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
        const cellKey = `${prev.empIndex}-${prev.dayIndex}`;
        handleCellTagsChange(cellKey, newSelectedTags);
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
              badge: '/icon32.png'
            });
          }
        });
      }
    }
  };

  // Функция для генерации PDF расписания
  const generateSchedulePDF = async () => {
    try {
      console.log('🔄 Начинаем генерацию PDF...');
      
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
      const firstDay = dayLabels[0] || 'пн';
      const lastDay = dayLabels[dayLabels.length - 1] || 'вс';
      
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

      console.log('📸 Создаем снимок расписания...');

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

      console.log('📄 Создаем PDF документ...');

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
      
      console.log('✅ PDF успешно создан');
      
      // Возвращаем PDF как blob для отправки
      return pdf.output('blob');
    } catch (error) {
      console.error('❌ Ошибка при генерации PDF:', error);
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
        console.log('✅ PDF успешно отправлен в Telegram с превью');
        return true;
      } else {
        console.error('❌ Ошибка отправки PDF в Telegram:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ Ошибка при отправке PDF в Telegram:', error);
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
        console.log('✅ Сообщение успешно отправлено в Telegram');
        return true;
      } else {
        console.error('❌ Ошибка отправки в Telegram:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ Ошибка при отправке в Telegram:', error);
      return false;
    }
  };

  // Обработчик кнопки "Опубликовать"
  const handlePublish = async () => {
    try {
      console.log('🚀 Начинаем публикацию расписания...');
      
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
        console.log('📱 Отправляем в Telegram...');
        
        // Сначала отправляем PDF (более быстрый способ)
        let pdfSent = false;
        try {
          const pdfBlob = await generateSchedulePDF();
          pdfSent = await sendPDFToTelegram(pdfBlob);
        } catch (pdfError) {
          console.error('❌ Ошибка генерации/отправки PDF:', pdfError);
        }
        
        // Затем отправляем дополнительное текстовое сообщение (если нужно)
        let messageSent = true; // PDF уже содержит всю нужную информацию
        
        if (pdfSent) {
          console.log('✅ Публикация завершена успешно');
          alert('✅ Расписание успешно опубликовано!\n📊 PDF с превью отправлен в Telegram.');
        } else {
          console.log('⚠️ Публикация завершена с ошибками');
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
        console.log('✅ Локальная публикация завершена');
        alert('✅ Расписание успешно опубликовано!');
      }
    } catch (error) {
      console.error('❌ Критическая ошибка при публикации:', error);
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
      console.error('Ошибка при скачивании PDF:', error);
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
        onViewSwitch={setCurrentView}
        onBulkEditToggle={toggleBulkEdit}
        onSettingsOpen={() => setSettingsModal(true)}
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
      />
      
      <div className="content">
        <Legend 
          shiftTypes={settings.shiftTypes}
          filters={filters}
          onFilterToggle={toggleFilter}
        />

        {currentView === 'grid' && (
          <GridView 
            employees={settings.employees}
            schedule={schedule}
            shiftTypes={settings.shiftTypes}
            selectedCells={selectedCells}
            bulkEditMode={bulkEditMode}
            cellTags={cellTags}
            tags={settings.tags}
            onCellClick={handleCellClick}
            onCellRightClick={handleCellRightClick}
            onDateClick={handleDateClick}
            shouldShowEmployee={shouldShowEmployee}
          />
        )}

        {currentView === 'timeline' && (
          <TimelineView 
            employees={settings.employees}
            schedule={schedule}
            shiftTypes={settings.shiftTypes}
            selectedCells={selectedCells}
            bulkEditMode={bulkEditMode}
            cellTags={cellTags}
            tags={settings.tags}
            onCellClick={handleCellClick}
            onCellRightClick={handleCellRightClick}
            shouldShowEmployee={shouldShowEmployee}
          />
        )}

        {currentView === 'gantt' && selectedDay !== null && (
          <GanttView 
            employees={settings.employees}
            schedule={schedule}
            shiftTypes={settings.shiftTypes}
            selectedDay={selectedDay}
            cellTags={cellTags}
            tags={settings.tags}
            onBackToGrid={() => setCurrentView('grid')}
            onDaySelect={setSelectedDay}
            shouldShowEmployee={shouldShowEmployee}
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
          onTagToggle={handleTagToggle}
          onClose={() => setPopup({ open: false, empIndex: null, dayIndex: null, selectedTags: [] })}
        />

        <SettingsModal 
          isOpen={settingsModal}
          settings={settings}
          connectionState={connectionState}
          onClose={() => setSettingsModal(false)}
          onEmployeeChange={handleEmployeeChange}
          onRemoveEmployee={handleRemoveEmployee}
          onAddEmployee={handleAddEmployee}
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