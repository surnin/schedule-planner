import React, { useState, useEffect } from 'react';
import './App.css';

import { useLocalStorage } from './hooks/useLocalStorage';
import { useAblyConnection } from './hooks/useAblyConnection';
import { defaultEmployees, defaultShiftTypes, defaultFilters, initialData, defaultTags } from './constants/defaultData';
import { injectShiftStyles } from './utils/styleUtils';

import Header from './components/Header';
import Legend from './components/Legend';
import GridView from './components/GridView';
import TimelineView from './components/TimelineView';
import GanttView from './components/GanttView';
import SettingsModal from './components/SettingsModal';
import ShiftAndTagPopup from './components/ShiftAndTagPopup';

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

  const { connectionState, onlineUsers, publishScheduleUpdate, publishSettingsUpdate, publishCellTagsUpdate, sendTestMessage } = 
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
            onTagClick={handleCellClick}
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
            onTagClick={handleCellClick}
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
            onTagClick={handleCellClick}
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
        />
      </div>
    </div>
  );
}

export default App;