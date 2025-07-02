import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { defaultEmployees, defaultShiftTypes, defaultTags, defaultWorkingHours, defaultPositions } from '../constants/defaultData';

// Create the main application store
export const useAppStore = create(
  persist(
    (set, get) => ({
      // Settings state
      settings: {
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
      },

      // Schedule state
      schedule: {},
      cellTags: {},
      flexibleShifts: {},
      
      // View state
      currentView: 'grid',
      selectedDay: null,
      currentStartDate: (() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        return monday.toISOString().split('T')[0];
      })(),
      viewPeriod: 14,
      selectedPosition: 'all',

      // UI state
      isAuthenticated: true,
      connectionState: 'disconnected',
      onlineUsers: new Set(),

      // Actions for settings
      updateSettings: (newSettings) => {
        set((state) => {
          const updatedSettings = {
            ...state.settings,
            ...newSettings,
            // Ensure nested objects are properly merged
            employees: newSettings.employees !== undefined ? newSettings.employees : state.settings.employees,
            positions: newSettings.positions !== undefined ? newSettings.positions : state.settings.positions,
            shiftTypes: newSettings.shiftTypes !== undefined ? newSettings.shiftTypes : state.settings.shiftTypes,
            tags: newSettings.tags !== undefined ? newSettings.tags : state.settings.tags,
            admins: newSettings.admins !== undefined ? newSettings.admins : state.settings.admins,
            websocket: newSettings.websocket !== undefined ? newSettings.websocket : state.settings.websocket,
            telegram: newSettings.telegram !== undefined ? newSettings.telegram : state.settings.telegram,
            workingHours: newSettings.workingHours !== undefined ? newSettings.workingHours : state.settings.workingHours
          };

          // Reset authentication if admins change
          let newAuthState = state.isAuthenticated;
          if (newSettings.admins !== undefined && 
              JSON.stringify(newSettings.admins) !== JSON.stringify(state.settings.admins || [])) {
            newAuthState = false;
          }

          return {
            settings: updatedSettings,
            isAuthenticated: newAuthState
          };
        });
      },

      // Actions for schedule
      updateSchedule: (newSchedule) => set({ schedule: newSchedule }),
      
      setScheduleByKey: (key, shiftType) =>
        set((state) => {
          const newSchedule = { ...state.schedule };
          if (shiftType === 'clear' || !shiftType) {
            delete newSchedule[key];
          } else {
            newSchedule[key] = shiftType;
          }
          return { schedule: newSchedule };
        }),

      clearAllScheduleData: () => set({ 
        schedule: {}, 
        cellTags: {}, 
        flexibleShifts: {} 
      }),

      // Actions for cell tags
      updateCellTags: (newCellTags) => set({ cellTags: newCellTags }),
      
      setCellTagsByKey: (key, tags) =>
        set((state) => {
          const newCellTags = { ...state.cellTags };
          if (!tags || tags.length === 0) {
            delete newCellTags[key];
          } else {
            newCellTags[key] = tags;
          }
          return { cellTags: newCellTags };
        }),

      // Actions for flexible shifts
      updateFlexibleShifts: (newFlexibleShifts) => set({ flexibleShifts: newFlexibleShifts }),
      
      setFlexibleShiftByKey: (key, shiftData) =>
        set((state) => ({
          flexibleShifts: {
            ...state.flexibleShifts,
            [key]: shiftData
          }
        })),

      // Actions for view state
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedDay: (day) => set({ selectedDay: day }),
      setCurrentStartDate: (date) => set({ currentStartDate: date }),
      setViewPeriod: (period) => set({ viewPeriod: period }),
      setSelectedPosition: (position) => set({ selectedPosition: position }),

      // Actions for authentication
      setIsAuthenticated: (isAuth) => set({ isAuthenticated: isAuth }),

      // Actions for connection state
      setConnectionState: (state) => set({ connectionState: state }),
      setOnlineUsers: (users) => set({ onlineUsers: users }),

      // Bulk actions for better performance
      bulkUpdateScheduleCells: (updates) =>
        set((state) => {
          const newSchedule = { ...state.schedule };
          const newCellTags = { ...state.cellTags };
          
          updates.forEach(({ key, shiftType, clearTags }) => {
            if (shiftType === 'clear' || !shiftType) {
              delete newSchedule[key];
              if (clearTags) {
                delete newCellTags[key];
              }
            } else {
              newSchedule[key] = shiftType;
            }
          });

          return { 
            schedule: newSchedule, 
            cellTags: newCellTags 
          };
        }),

      // Employee management actions
      addEmployee: (employee) =>
        set((state) => ({
          settings: {
            ...state.settings,
            employees: [...state.settings.employees, employee]
          }
        })),

      removeEmployee: (index) =>
        set((state) => ({
          settings: {
            ...state.settings,
            employees: state.settings.employees.filter((_, i) => i !== index)
          }
        })),

      updateEmployee: (index, field, value) =>
        set((state) => {
          const newEmployees = [...state.settings.employees];
          if (typeof newEmployees[index] === 'string') {
            newEmployees[index] = { name: newEmployees[index], position: '' };
          }
          newEmployees[index] = { ...newEmployees[index], [field]: value };
          
          return {
            settings: {
              ...state.settings,
              employees: newEmployees
            }
          };
        }),

      // Position management actions
      addPosition: (position) =>
        set((state) => ({
          settings: {
            ...state.settings,
            positions: [...state.settings.positions, position]
          }
        })),

      removePosition: (index) =>
        set((state) => {
          const positionToRemove = state.settings.positions[index];
          const newPositions = state.settings.positions.filter((_, i) => i !== index);
          
          // Remove position from all employees
          const newEmployees = state.settings.employees.map(emp => {
            if (typeof emp === 'string') return emp;
            if (emp.position === positionToRemove) {
              return { ...emp, position: '' };
            }
            return emp;
          });

          return {
            settings: {
              ...state.settings,
              positions: newPositions,
              employees: newEmployees
            }
          };
        }),

      updatePosition: (index, value) =>
        set((state) => {
          const newPositions = [...state.settings.positions];
          newPositions[index] = value;
          
          return {
            settings: {
              ...state.settings,
              positions: newPositions
            }
          };
        }),

      // Shift type management actions
      addShiftType: (key, shiftType) =>
        set((state) => ({
          settings: {
            ...state.settings,
            shiftTypes: {
              ...state.settings.shiftTypes,
              [key]: shiftType
            }
          }
        })),

      removeShiftType: (key) =>
        set((state) => {
          const newShiftTypes = { ...state.settings.shiftTypes };
          delete newShiftTypes[key];
          
          return {
            settings: {
              ...state.settings,
              shiftTypes: newShiftTypes
            }
          };
        }),

      updateShiftType: (key, field, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            shiftTypes: {
              ...state.settings.shiftTypes,
              [key]: {
                ...state.settings.shiftTypes[key],
                [field]: value
              }
            }
          }
        })),

      // Tag management actions
      addTag: (key, tag) =>
        set((state) => ({
          settings: {
            ...state.settings,
            tags: {
              ...state.settings.tags,
              [key]: tag
            }
          }
        })),

      removeTag: (key) =>
        set((state) => {
          const newTags = { ...state.settings.tags };
          delete newTags[key];
          
          return {
            settings: {
              ...state.settings,
              tags: newTags
            }
          };
        }),

      updateTag: (key, field, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            tags: {
              ...state.settings.tags,
              [key]: {
                ...state.settings.tags[key],
                [field]: value
              }
            }
          }
        }))
    }),
    {
      name: 'schedule-planner-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        schedule: state.schedule,
        cellTags: state.cellTags,
        flexibleShifts: state.flexibleShifts,
        currentView: state.currentView,
        selectedDay: state.selectedDay,
        currentStartDate: state.currentStartDate,
        viewPeriod: state.viewPeriod,
        selectedPosition: state.selectedPosition,
        isAuthenticated: state.isAuthenticated
      }),
      // Convert Set back to array for serialization
      serialize: (state) => {
        const serializedState = {
          ...state,
          onlineUsers: Array.from(state.onlineUsers)
        };
        return JSON.stringify(serializedState);
      },
      // Convert array back to Set on deserialization
      deserialize: (str) => {
        const state = JSON.parse(str);
        return {
          ...state,
          onlineUsers: new Set(state.onlineUsers || [])
        };
      }
    }
  )
);

// Selectors for better performance
export const useSettings = () => useAppStore((state) => state.settings);
export const useSchedule = () => useAppStore((state) => state.schedule);
export const useCellTags = () => useAppStore((state) => state.cellTags);
export const useFlexibleShifts = () => useAppStore((state) => state.flexibleShifts);
export const useViewState = () => useAppStore((state) => ({
  currentView: state.currentView,
  selectedDay: state.selectedDay,
  currentStartDate: state.currentStartDate,
  viewPeriod: state.viewPeriod,
  selectedPosition: state.selectedPosition
}));
export const useAuth = () => useAppStore((state) => ({
  isAuthenticated: state.isAuthenticated,
  setIsAuthenticated: state.setIsAuthenticated
}));
export const useConnection = () => useAppStore((state) => ({
  connectionState: state.connectionState,
  onlineUsers: state.onlineUsers,
  setConnectionState: state.setConnectionState,
  setOnlineUsers: state.setOnlineUsers
}));