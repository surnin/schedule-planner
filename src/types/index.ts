// Core types for the Schedule Planner application

export interface Employee {
  name: string;
  position: string;
}

export interface ShiftType {
  label: string;
  time: string;
  shortLabel: string;
  start: number | null;
  startMinutes: number;
  end: number | null;
  endMinutes: number;
  color: string;
  isFlexible?: boolean;
}

export interface Tag {
  label: string;
  color: string;
  shortLabel: string;
}

export interface WorkingHours {
  start: number;
  startMinutes: number;
  end: number;
  endMinutes: number;
}

export interface WebSocketSettings {
  url: string;
  apiKey: string;
  roomId: string;
  enabled: boolean;
}

export interface TelegramSettings {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

export interface Settings {
  employees: Employee[];
  positions: string[];
  shiftTypes: Record<string, ShiftType>;
  tags: Record<string, Tag>;
  workingHours: WorkingHours;
  websocket: WebSocketSettings;
  telegram: TelegramSettings;
  admins: string[];
  debug: boolean;
}

export interface FlexibleShiftData {
  start: number;
  startMinutes: number;
  end: number;
  endMinutes: number;
}

export interface PopupState {
  open: boolean;
  empIndex: number | null;
  dayIndex: number | null;
  selectedTags: string[];
}

export interface FlexibleTimeModalState {
  open: boolean;
  empIndex: number | null;
  dayIndex: number | null;
}

export interface DayType {
  isWeekend: boolean;
  isFirstOfMonth: boolean;
}

// Schedule data types
export type Schedule = Record<string, string>; // dateKey -> shiftType
export type CellTags = Record<string, string[]>; // dateKey -> tagKeys
export type FlexibleShifts = Record<string, FlexibleShiftData>; // dateKey -> shift data

// View types
export type ViewType = 'grid' | 'timeline';
export type PositionFilter = 'all' | string;

// Connection states
export type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'failed';

// Hook return types
export interface ScheduleLogicHook {
  // State
  schedule: Schedule;
  currentView: ViewType;
  selectedDay: number | null;
  currentStartDate: string;
  viewPeriod: number;
  flexibleShifts: FlexibleShifts;
  cellTags: CellTags;
  
  // Setters
  setCurrentView: (view: ViewType) => void;
  setSelectedDay: (day: number | null) => void;
  setCurrentStartDate: (date: string) => void;
  setViewPeriod: (period: number) => void;
  
  // Schedule functions
  getScheduleByDate: (filteredEmpIndex: number, dayIndex: number) => string | null;
  setScheduleByDate: (empIndex: number, dayIndex: number, shiftType: string | null) => void;
  handleScheduleUpdate: (newSchedule: Schedule) => void;
  clearAllData: () => void;
  
  // Flexible shift functions
  getFlexibleShiftData: (empIndex: number, dayIndex: number) => FlexibleShiftData | null;
  handleFlexibleTimeConfirm: (empIndex: number, dayIndex: number, timeData: FlexibleShiftData) => void;
  
  // Cell tags functions
  getCellTagsByDate: (filteredEmpIndex: number, dayIndex: number) => string[];
  setCellTagsByDate: (empIndex: number, dayIndex: number, tags: string[]) => void;
  handleCellTagsUpdate: (newCellTags: CellTags) => void;
  
  // Date utilities
  getDateFromIndex: (dayIndex: number) => string;
  getDateKey: (filteredEmpIndex: number, dayIndex: number) => string;
  generateDayLabels: (startDate: string, period: number) => string[];
  getDayType: (dayIndex: number) => DayType;
  
  // Navigation
  handleDateClick: (dayIndex: number) => void;
  handleViewSwitch: (view: ViewType) => void;
}

export interface EmployeeManagementHook {
  // State
  selectedPosition: PositionFilter;
  filteredEmployees: Employee[];
  
  // Employee functions
  getFilteredEmployees: () => Employee[];
  getFullEmployeeIndex: (filteredIndex: number) => number;
  getEmployeeId: (empIndex: number) => string;
  shouldShowEmployee: (filteredEmpIndex: number) => boolean;
  handleEmployeeChange: (empIndex: number, field: keyof Employee, value: string) => void;
  handleRemoveEmployee: (empIndex: number) => void;
  handleAddEmployee: () => void;
  
  // Position functions
  handlePositionChange: (posIndex: number, newValue: string) => void;
  handleRemovePosition: (posIndex: number) => void;
  handleAddPosition: () => void;
  handlePositionFilterChange: (position: PositionFilter) => void;
  
  // Setters
  setSelectedPosition: (position: PositionFilter) => void;
}

export interface ShiftManagementHook {
  // Shift type management
  handleShiftTypeChange: (shiftKey: string, field: keyof ShiftType, value: any) => void;
  handleRemoveShiftType: (shiftKey: string) => void;
  handleAddShiftType: () => void;
  
  // Working hours management
  handleWorkingHoursChange: (field: keyof WorkingHours, value: number) => void;
  
  // Shift operations
  handleShiftChange: (
    shiftType: string,
    selectedCells: Set<string>,
    schedule: Schedule,
    setSchedule: (schedule: Schedule) => void,
    publishScheduleUpdate: (schedule: Schedule) => void,
    setCellTags: (tags: CellTags) => void,
    bulkEditMode: boolean
  ) => { clearSelection: boolean };
  
  // Utilities
  parseTime: (timeString: string) => { hours: number; minutes: number };
  formatTime: (hours: number, minutes?: number) => string;
  validateShiftTime: (startHour: number, startMinute: number, endHour: number, endMinute: number) => boolean;
  getShiftDisplay: (
    shiftType: string,
    empIndex: number | null,
    dayIndex: number | null,
    getFlexibleShiftData?: (empIndex: number, dayIndex: number) => FlexibleShiftData | null,
    showTime?: boolean
  ) => string;
  
  // Derived state
  shiftTypes: Record<string, ShiftType>;
  workingHours: WorkingHours;
}

// Ably WebSocket types
export interface AblyConnectionHook {
  connectionState: ConnectionState;
  onlineUsers: Set<string>;
  publishScheduleUpdate: (schedule: Schedule) => void;
  publishSettingsUpdate: (settings: Settings) => void;
  publishCellTagsUpdate: (cellTags: CellTags) => void;
  publishAuthStateUpdate: (isAuthenticated: boolean, admins: string[]) => void;
  sendTestMessage: () => void;
  sendPushNotification: (title: string, message: string) => void;
  requestExistingData: () => void;
}