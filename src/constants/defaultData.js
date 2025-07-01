export const defaultPositions = [
  'Администратор', 'Мастер', 'Стажер', 'Консультант', 'Менеджер'
];

export const defaultEmployees = [
  { name: 'Ильвина', position: 'Администратор' },
  { name: 'Инесса', position: 'Мастер' },
  { name: 'Альбина', position: 'Мастер' },
  { name: 'Анастасия', position: 'Консультант' },
  { name: 'Арина', position: 'Стажер' },
  { name: 'Ксения', position: 'Мастер' },
  { name: 'Света', position: 'Консультант' },
  { name: 'Елена', position: 'Администратор' },
  { name: 'Леся', position: 'Мастер' },
  { name: 'Алия', position: 'Менеджер' },
  { name: 'Даша', position: 'Стажер' }
];

export const defaultShiftTypes = {
  morning: { label: 'Утро', time: '8:00-16:00', shortLabel: 'У', start: 8, startMinutes: 0, end: 16, endMinutes: 0, color: '#FFD700' },
  day: { label: 'День', time: '10:00-18:00', shortLabel: 'Д', start: 10, startMinutes: 0, end: 18, endMinutes: 0, color: '#4CAF50' },
  evening: { label: 'Вечер', time: '16:00-00:00', shortLabel: 'В', start: 16, startMinutes: 0, end: 24, endMinutes: 0, color: '#2196F3' },
  night: { label: 'Ночь', time: '00:00-08:00', shortLabel: 'Н', start: 0, startMinutes: 0, end: 8, endMinutes: 0, color: '#9C27B0' },
  flexible: { label: 'Свободная смена', time: '', shortLabel: 'С', start: null, end: null, color: '#00BCD4', isFlexible: true },
  off: { label: 'Выходной', time: '', shortLabel: 'В', start: null, end: null, color: '#f44336' },
  vacation: { label: 'Отпуск', time: '', shortLabel: 'О', start: null, end: null, color: '#FF9800' },
  sick: { label: 'Больничный', time: '', shortLabel: 'Б', start: null, end: null, color: '#9E9E9E' }
};

export const initialData = {
  'Альбина': ['morning', 'day', 'evening', 'night', 'off', 'vacation', 'sick', 'morning', 'day', 'evening', 'night', 'off', 'vacation', 'sick'],
  'Анастасия': ['day', 'day', 'day', 'day', 'day', 'off', 'off', 'day', 'day', 'day', 'day', 'day', 'off', 'off'],
  'Арина': ['evening', 'evening', 'evening', 'evening', 'evening', 'off', 'off', 'evening', 'evening', 'evening', 'evening', 'evening', 'off', 'off'],
  'Алия': ['morning', 'morning', 'off', 'off', 'vacation', 'vacation', 'vacation', 'night', 'night', 'night', 'night', 'night', 'off', 'off']
};

export const defaultFilters = {
  morning: true,
  day: true,
  evening: true,
  night: true,
  flexible: true,
  off: true,
  vacation: true,
  sick: true,
  empty: true
};


export const defaultTags = {
  important: { label: 'Важно', color: '#ff4444', shortLabel: 'Важно' },
  training: { label: 'Обучение', color: '#44ff44', shortLabel: 'Обучение' },
  overtime: { label: 'Сверхурочно', color: '#ffaa00', shortLabel: 'Сверхурочно' }
};

export const defaultWorkingHours = {
  start: 8,
  startMinutes: 0,
  end: 22,
  endMinutes: 0
};

