import { useState, useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export const useScheduleLogic = (settings, publishScheduleUpdate, publishCellTagsUpdate) => {
  // Schedule-related state
  const [schedule, setSchedule] = useLocalStorage('schedule-planner-data', () => {
    const initial = {};
    if (settings?.employees) {
      settings.employees.forEach((emp, empIndex) => {
        for (let day = 0; day < 14; day++) {
          const key = `${empIndex}-${day}`;
          const empName = typeof emp === 'string' ? emp : emp.name;
          // Initialize with empty schedule - remove dependency on initialData
        }
      });
    }
    return initial;
  });

  const [currentView, setCurrentView] = useLocalStorage('schedule-planner-view', 'grid');
  const [selectedDay, setSelectedDay] = useLocalStorage('schedule-planner-selected-day', null);
  const [currentStartDate, setCurrentStartDate] = useLocalStorage('schedule-planner-start-date', getDefaultStartDate());
  const [viewPeriod, setViewPeriod] = useLocalStorage('schedule-planner-view-period', 14);
  const [flexibleShifts, setFlexibleShifts] = useLocalStorage('schedule-planner-flexible-shifts', {});
  const [cellTags, setCellTags] = useLocalStorage('schedule-planner-tags', {});

  // Helper function for default start date
  function getDefaultStartDate() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    return monday.toISOString().split('T')[0];
  }

  // Date utility functions
  const getDateFromIndex = useCallback((dayIndex) => {
    try {
      const start = new Date(currentStartDate);
      if (isNaN(start.getTime())) {
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + dayIndex);
        return targetDate.toISOString().split('T')[0];
      }
      
      const targetDate = new Date(start);
      targetDate.setDate(start.getDate() + dayIndex);
      return targetDate.toISOString().split('T')[0];
    } catch (error) {
      const today = new Date();
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayIndex);
      return targetDate.toISOString().split('T')[0];
    }
  }, [currentStartDate]);

  // Employee ID generation
  const getEmployeeId = useCallback((empIndex) => {
    const employee = settings?.employees?.[empIndex];
    if (!employee) return `emp-${empIndex}`;
    const empName = typeof employee === 'string' ? employee : employee.name;
    return empName;
  }, [settings?.employees]);

  // Date key generation
  const getDateKeyInternal = useCallback((empIndex, dayIndex) => {
    const dateStr = getDateFromIndex(dayIndex);
    const employeeId = getEmployeeId(empIndex);
    return `${employeeId}-${dateStr}`;
  }, [getDateFromIndex, getEmployeeId]);

  const getDateKey = useCallback((filteredEmpIndex, dayIndex) => {
    // This will need to be connected to employee management logic
    const empIndex = filteredEmpIndex; // Simplified for now
    return getDateKeyInternal(empIndex, dayIndex);
  }, [getDateKeyInternal]);

  // Schedule management functions
  const getScheduleByDateInternal = useCallback((empIndex, dayIndex) => {
    const dateKey = getDateKeyInternal(empIndex, dayIndex);
    return schedule[dateKey] || null;
  }, [schedule, getDateKeyInternal]);

  const getScheduleByDate = useCallback((filteredEmpIndex, dayIndex) => {
    const empIndex = filteredEmpIndex; // Will be connected to employee management
    return getScheduleByDateInternal(empIndex, dayIndex);
  }, [getScheduleByDateInternal]);

  const setScheduleByDate = useCallback((empIndex, dayIndex, shiftType) => {
    const dateKey = getDateKeyInternal(empIndex, dayIndex);
    setSchedule(prev => {
      const newSchedule = { ...prev };
      if (shiftType === 'clear' || !shiftType) {
        delete newSchedule[dateKey];
        // Also clear tags for this cell
        setCellTags(prevTags => {
          const newTags = { ...prevTags };
          delete newTags[dateKey];
          if (publishCellTagsUpdate) {
            publishCellTagsUpdate(newTags);
          }
          return newTags;
        });
      } else {
        newSchedule[dateKey] = shiftType;
      }
      if (publishScheduleUpdate) {
        publishScheduleUpdate(newSchedule);
      }
      return newSchedule;
    });
  }, [getDateKeyInternal, publishScheduleUpdate, publishCellTagsUpdate, setCellTags]);

  // Flexible shift management
  const getFlexibleShiftData = useCallback((empIndex, dayIndex) => {
    const employeeId = getEmployeeId(empIndex);
    const dateStr = getDateFromIndex(dayIndex);
    const key = `${employeeId}-${dateStr}`;
    return flexibleShifts[key] || null;
  }, [flexibleShifts, getEmployeeId, getDateFromIndex]);

  const handleFlexibleTimeConfirm = useCallback((empIndex, dayIndex, timeData) => {
    const employeeId = getEmployeeId(empIndex);
    const dateStr = getDateFromIndex(dayIndex);
    const key = `${employeeId}-${dateStr}`;
    
    setFlexibleShifts(prev => ({
      ...prev,
      [key]: timeData
    }));
  }, [getEmployeeId, getDateFromIndex]);

  // Cell tags management
  const getCellTagsByDateInternal = useCallback((empIndex, dayIndex) => {
    const dateKey = getDateKeyInternal(empIndex, dayIndex);
    return cellTags[dateKey] || [];
  }, [cellTags, getDateKeyInternal]);

  const getCellTagsByDate = useCallback((filteredEmpIndex, dayIndex) => {
    const empIndex = filteredEmpIndex; // Will be connected to employee management
    return getCellTagsByDateInternal(empIndex, dayIndex);
  }, [getCellTagsByDateInternal]);

  const setCellTagsByDate = useCallback((empIndex, dayIndex, tags) => {
    const dateKey = getDateKeyInternal(empIndex, dayIndex);
    setCellTags(prev => {
      const newTags = { ...prev };
      if (!tags || tags.length === 0) {
        delete newTags[dateKey];
      } else {
        newTags[dateKey] = tags;
      }
      if (publishCellTagsUpdate) {
        publishCellTagsUpdate(newTags);
      }
      return newTags;
    });
  }, [getDateKeyInternal, publishCellTagsUpdate]);

  // Clear all data
  const clearAllData = useCallback(() => {
    setSchedule({});
    setCellTags({});
    setFlexibleShifts({});
  }, [setSchedule, setCellTags, setFlexibleShifts]);

  // Day labels generation
  const generateDayLabels = useCallback((startDate, period) => {
    const labels = [];
    try {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        // Fallback for invalid date
        const today = new Date();
        for (let i = 0; i < period; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
          const dayNum = date.getDate();
          const monthName = date.toLocaleDateString('ru-RU', { month: 'short' });
          labels.push(`${dayName}\n${dayNum} ${monthName}`);
        }
        return labels;
      }
      
      for (let i = 0; i < period; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
        const dayNum = date.getDate();
        const monthName = date.toLocaleDateString('ru-RU', { month: 'short' });
        labels.push(`${dayName}\n${dayNum} ${monthName}`);
      }
    } catch (error) {
      // Error fallback
      for (let i = 0; i < period; i++) {
        labels.push(`День ${i + 1}`);
      }
    }
    return labels;
  }, []);

  // Day type determination
  const getDayType = useCallback((dayIndex) => {
    try {
      const start = new Date(currentStartDate);
      if (isNaN(start.getTime())) return { isWeekend: false, isFirstOfMonth: false };
      
      const targetDate = new Date(start);
      targetDate.setDate(start.getDate() + dayIndex);
      
      const dayOfWeek = targetDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isFirstOfMonth = targetDate.getDate() === 1;
      
      return { isWeekend, isFirstOfMonth };
    } catch (error) {
      return { isWeekend: false, isFirstOfMonth: false };
    }
  }, [currentStartDate]);

  // Navigation functions
  const handleDateClick = useCallback((dayIndex) => {
    setSelectedDay(dayIndex);
  }, [setSelectedDay]);

  const handleViewSwitch = useCallback((view) => {
    setCurrentView(view);
  }, [setCurrentView]);

  // Update handlers that will be called from parent
  const handleScheduleUpdate = useCallback((newSchedule) => {
    setSchedule(newSchedule);
  }, [setSchedule]);

  const handleCellTagsUpdate = useCallback((newCellTags) => {
    setCellTags(newCellTags);
  }, [setCellTags]);

  return {
    // State
    schedule,
    currentView,
    selectedDay,
    currentStartDate,
    viewPeriod,
    flexibleShifts,
    cellTags,
    
    // Setters
    setCurrentView,
    setSelectedDay,
    setCurrentStartDate,
    setViewPeriod,
    
    // Schedule functions
    getScheduleByDate,
    setScheduleByDate,
    handleScheduleUpdate,
    clearAllData,
    
    // Flexible shift functions
    getFlexibleShiftData,
    handleFlexibleTimeConfirm,
    
    // Cell tags functions
    getCellTagsByDate,
    setCellTagsByDate,
    handleCellTagsUpdate,
    
    // Date utilities
    getDateFromIndex,
    getDateKey,
    generateDayLabels,
    getDayType,
    
    // Navigation
    handleDateClick,
    handleViewSwitch
  };
};