export const generateShiftStyles = (shiftTypes) => {
  const styles = Object.entries(shiftTypes).map(([key, shiftType]) => {
    if (!shiftType.color) return '';
    
    return `
      .shift-${key} {
        background: ${shiftType.color} !important;
      }
      
      .shift-${key}:hover {
        background: ${adjustBrightness(shiftType.color, -10)} !important;
      }
    `;
  }).join('\n');
  
  return styles;
};

export const adjustBrightness = (hexColor, amount) => {
  // Конвертируем hex в RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Корректируем яркость
  const newR = Math.max(0, Math.min(255, r + amount));
  const newG = Math.max(0, Math.min(255, g + amount));
  const newB = Math.max(0, Math.min(255, b + amount));
  
  // Конвертируем обратно в hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

export const injectShiftStyles = (shiftTypes) => {
  // Удаляем предыдущие динамические стили
  const existingStyle = document.getElementById('dynamic-shift-styles');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Создаем новые стили
  const styles = generateShiftStyles(shiftTypes);
  if (!styles) return;
  
  const styleElement = document.createElement('style');
  styleElement.id = 'dynamic-shift-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
};