import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export const useEmployeeManagement = (settings, onSettingsUpdate) => {
  const [selectedPosition, setSelectedPosition] = useLocalStorage('schedule-planner-position-filter', 'all');

  // Employee filtering and indexing
  const getFilteredEmployees = useCallback(() => {
    if (!settings?.employees) return [];
    
    if (selectedPosition === 'all') {
      return settings.employees;
    }
    
    return settings.employees.filter(emp => {
      const position = typeof emp === 'string' ? null : emp.position;
      return position === selectedPosition;
    });
  }, [settings?.employees, selectedPosition]);

  const getFullEmployeeIndex = useCallback((filteredIndex) => {
    if (!settings?.employees) return filteredIndex;
    
    if (selectedPosition === 'all') {
      return filteredIndex;
    }
    
    const filteredEmployees = getFilteredEmployees();
    const targetEmployee = filteredEmployees[filteredIndex];
    
    if (!targetEmployee) return filteredIndex;
    
    return settings.employees.findIndex(emp => {
      const empName1 = typeof emp === 'string' ? emp : emp.name;
      const empName2 = typeof targetEmployee === 'string' ? targetEmployee : targetEmployee.name;
      return empName1 === empName2;
    });
  }, [settings?.employees, selectedPosition, getFilteredEmployees]);

  const getEmployeeId = useCallback((empIndex) => {
    const employee = settings?.employees?.[empIndex];
    if (!employee) return `emp-${empIndex}`;
    const empName = typeof employee === 'string' ? employee : employee.name;
    return empName;
  }, [settings?.employees]);

  const shouldShowEmployee = useCallback((filteredEmpIndex) => {
    const filteredEmployees = getFilteredEmployees();
    return filteredEmpIndex < filteredEmployees.length;
  }, [getFilteredEmployees]);

  // Employee management functions
  const handleEmployeeChange = useCallback((empIndex, field, value) => {
    if (!settings?.employees || !onSettingsUpdate) return;

    const newEmployees = [...settings.employees];
    
    if (field === 'name') {
      if (typeof newEmployees[empIndex] === 'string') {
        // Convert string to object when updating name
        newEmployees[empIndex] = { name: value, position: '' };
      } else {
        newEmployees[empIndex] = { ...newEmployees[empIndex], name: value };
      }
    } else if (field === 'position') {
      if (typeof newEmployees[empIndex] === 'string') {
        // Convert string to object when updating position
        newEmployees[empIndex] = { name: newEmployees[empIndex], position: value };
      } else {
        newEmployees[empIndex] = { ...newEmployees[empIndex], position: value };
      }
    }

    const newSettings = {
      ...settings,
      employees: newEmployees
    };

    onSettingsUpdate(newSettings);
  }, [settings, onSettingsUpdate]);

  const handleRemoveEmployee = useCallback((empIndex) => {
    if (!settings?.employees || !onSettingsUpdate) return;

    const newEmployees = settings.employees.filter((_, index) => index !== empIndex);
    const newSettings = {
      ...settings,
      employees: newEmployees
    };

    onSettingsUpdate(newSettings);
  }, [settings, onSettingsUpdate]);

  const handleAddEmployee = useCallback(() => {
    if (!settings?.employees || !onSettingsUpdate) return;

    const newEmployee = { name: `Сотрудник ${settings.employees.length + 1}`, position: '' };
    const newSettings = {
      ...settings,
      employees: [...settings.employees, newEmployee]
    };

    onSettingsUpdate(newSettings);
  }, [settings, onSettingsUpdate]);

  // Position management functions
  const handlePositionChange = useCallback((posIndex, newValue) => {
    if (!settings?.positions || !onSettingsUpdate) return;

    const newPositions = [...settings.positions];
    newPositions[posIndex] = newValue;
    const newSettings = {
      ...settings,
      positions: newPositions
    };

    onSettingsUpdate(newSettings);
  }, [settings, onSettingsUpdate]);

  const handleRemovePosition = useCallback((posIndex) => {
    if (!settings?.positions || !onSettingsUpdate) return;

    const positionToRemove = settings.positions[posIndex];
    const newPositions = settings.positions.filter((_, index) => index !== posIndex);
    
    // Also remove this position from all employees
    const newEmployees = settings.employees?.map(emp => {
      if (typeof emp === 'string') return emp;
      if (emp.position === positionToRemove) {
        return { ...emp, position: '' };
      }
      return emp;
    }) || [];

    const newSettings = {
      ...settings,
      positions: newPositions,
      employees: newEmployees
    };

    onSettingsUpdate(newSettings);
  }, [settings, onSettingsUpdate]);

  const handleAddPosition = useCallback(() => {
    if (!settings?.positions || !onSettingsUpdate) return;

    const newPosition = `Должность ${settings.positions.length + 1}`;
    const newSettings = {
      ...settings,
      positions: [...settings.positions, newPosition]
    };

    onSettingsUpdate(newSettings);
  }, [settings, onSettingsUpdate]);

  // Position filtering
  const handlePositionFilterChange = useCallback((position) => {
    setSelectedPosition(position);
  }, [setSelectedPosition]);

  return {
    // State
    selectedPosition,
    
    // Derived state
    filteredEmployees: getFilteredEmployees(),
    
    // Employee functions
    getFilteredEmployees,
    getFullEmployeeIndex,
    getEmployeeId,
    shouldShowEmployee,
    handleEmployeeChange,
    handleRemoveEmployee,
    handleAddEmployee,
    
    // Position functions
    handlePositionChange,
    handleRemovePosition,
    handleAddPosition,
    handlePositionFilterChange,
    
    // Setters
    setSelectedPosition
  };
};