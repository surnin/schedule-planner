export const formatTime = (hours, minutes = 0) => {
  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const parseTime = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return { hours: 0, minutes: 0 };
  
  const parts = timeString.split(':');
  return {
    hours: parseInt(parts[0]) || 0,
    minutes: parseInt(parts[1]) || 0
  };
};

export const timeToMinutes = (hours, minutes = 0) => {
  return hours * 60 + minutes;
};

export const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
};

export const generateTimeOptions = (stepMinutes = 10) => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      options.push({
        value: timeToMinutes(hour, minute),
        label: formatTime(hour, minute),
        hours: hour,
        minutes: minute
      });
    }
  }
  return options;
};