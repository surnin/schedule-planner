import { useCallback, useEffect } from 'react';
import { injectShiftStyles } from '../utils/styleUtils';

export const useShiftManagement = (settings, onSettingsUpdate, publishCellTagsUpdate) => {
  
  // Inject shift styles when shift types change
  useEffect(() => {
    if (settings?.shiftTypes) {
      injectShiftStyles(settings.shiftTypes);
    }
  }, [settings?.shiftTypes]);

  // Shift type management functions
  const handleShiftTypeChange = useCallback((shiftKey, field, value) => {
    if (!settings?.shiftTypes || !onSettingsUpdate) return;

    const newShiftTypes = {
      ...settings.shiftTypes,
      [shiftKey]: {
        ...settings.shiftTypes[shiftKey],
        [field]: value
      }
    };

    const newSettings = {
      ...settings,
      shiftTypes: newShiftTypes
    };

    onSettingsUpdate(newSettings);
  }, [settings, onSettingsUpdate]);

  const handleRemoveShiftType = useCallback((shiftKey) => {
    if (!settings?.shiftTypes || !onSettingsUpdate) return;

    const newShiftTypes = { ...settings.shiftTypes };
    delete newShiftTypes[shiftKey];

    const newSettings = {
      ...settings,
      shiftTypes: newShiftTypes
    };

    onSettingsUpdate(newSettings);
  }, [settings, onSettingsUpdate]);

  const handleAddShiftType = useCallback(() => {
    if (!settings?.shiftTypes || !onSettingsUpdate) return;

    const shiftCount = Object.keys(settings.shiftTypes).length;
    const newShiftKey = `custom_${shiftCount + 1}`;
    const newShiftType = {
      label: `Смена ${shiftCount + 1}`,
      time: '9:00-17:00',
      shortLabel: `С${shiftCount + 1}`,
      start: 9,
      startMinutes: 0,
      end: 17,
      endMinutes: 0,
      color: '#4CAF50'
    };

    const newShiftTypes = {
      ...settings.shiftTypes,
      [newShiftKey]: newShiftType
    };

    const newSettings = {
      ...settings,
      shiftTypes: newShiftTypes
    };

    onSettingsUpdate(newSettings);
  }, [settings, onSettingsUpdate]);

  // Working hours management
  const handleWorkingHoursChange = useCallback((field, value) => {
    if (!settings?.workingHours || !onSettingsUpdate) return;

    const newWorkingHours = {
      ...settings.workingHours,
      [field]: value
    };

    const newSettings = {
      ...settings,
      workingHours: newWorkingHours
    };

    onSettingsUpdate(newSettings);
  }, [settings, onSettingsUpdate]);

  // Shift change handler for bulk operations
  const handleShiftChange = useCallback((shiftType, selectedCells, schedule, setSchedule, publishScheduleUpdate, setCellTags, bulkEditMode) => {
    let newSchedule;
    
    if (bulkEditMode && selectedCells && selectedCells.size > 0) {
      // Bulk edit mode
      setSchedule(prev => {
        newSchedule = { ...prev };
        selectedCells.forEach(cellKey => {
          if (shiftType === 'clear') {
            delete newSchedule[cellKey];
          } else {
            newSchedule[cellKey] = shiftType;
          }
        });
        if (publishScheduleUpdate) {
          publishScheduleUpdate(newSchedule);
        }
        return newSchedule;
      });
      
      // Also clear tags for selected cells when clearing shifts
      if (shiftType === 'clear' && setCellTags) {
        setCellTags(prevTags => {
          const newTags = { ...prevTags };
          selectedCells.forEach(cellKey => {
            delete newTags[cellKey];
          });
          if (publishCellTagsUpdate) {
            publishCellTagsUpdate(newTags);
          }
          return newTags;
        });
      }
      
      return { clearSelection: true };
    }
    
    return { clearSelection: false };
  }, [publishCellTagsUpdate]);

  // Time parsing utilities
  const parseTime = useCallback((timeString) => {
    if (!timeString) return { hours: 0, minutes: 0 };
    
    const [time] = timeString.split('-');
    const [hours, minutes] = time.split(':').map(Number);
    
    return {
      hours: isNaN(hours) ? 0 : hours,
      minutes: isNaN(minutes) ? 0 : minutes
    };
  }, []);

  const formatTime = useCallback((hours, minutes = 0) => {
    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    return `${h}:${m}`;
  }, []);

  // Shift validation
  const validateShiftTime = useCallback((startHour, startMinute, endHour, endMinute) => {
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    // Handle shifts that cross midnight
    if (endTotalMinutes <= startTotalMinutes) {
      return endTotalMinutes + 24 * 60 > startTotalMinutes;
    }
    
    return true;
  }, []);

  // Get shift display information
  const getShiftDisplay = useCallback((shiftType, empIndex, dayIndex, getFlexibleShiftData, showTime = true) => {
    const shift = settings?.shiftTypes?.[shiftType];
    if (!shift) return '';
    
    if (shift.isFlexible && getFlexibleShiftData && empIndex !== null && dayIndex !== null) {
      const flexibleData = getFlexibleShiftData(empIndex, dayIndex);
      if (flexibleData) {
        const startMinutes = flexibleData.startMinutes || 0;
        const endMinutes = flexibleData.endMinutes || 0;
        const startTime = formatTime(flexibleData.start, startMinutes);
        const endTime = formatTime(flexibleData.end, endMinutes);
        
        if (showTime) {
          return `${startTime}\n${endTime}`;
        }
        return shift.shortLabel;
      }
    }
    
    if (!shift || shift.start === null) {
      return showTime ? '' : shift.shortLabel;
    }
    
    if (showTime) {
      const startTime = formatTime(shift.start, shift.startMinutes || 0);
      const endTime = formatTime(shift.end, shift.endMinutes || 0);
      return `${startTime}\n${endTime}`;
    }
    
    return shift.shortLabel;
  }, [settings?.shiftTypes, formatTime]);

  return {
    // Shift type management
    handleShiftTypeChange,
    handleRemoveShiftType,
    handleAddShiftType,
    
    // Working hours management
    handleWorkingHoursChange,
    
    // Shift operations
    handleShiftChange,
    
    // Utilities
    parseTime,
    formatTime,
    validateShiftTime,
    getShiftDisplay,
    
    // Derived state
    shiftTypes: settings?.shiftTypes || {},
    workingHours: settings?.workingHours || { start: 8, startMinutes: 0, end: 22, endMinutes: 0 }
  };
};