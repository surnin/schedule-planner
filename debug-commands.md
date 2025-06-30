# Команды для отладки в консоли браузера

## Проверить сохраненные настройки:
```javascript
console.log('Настройки из localStorage:', JSON.parse(localStorage.getItem('schedule-planner-settings')));
```

## Проверить аутентификацию:
```javascript
console.log('Аутентификация:', localStorage.getItem('schedule-planner-auth'));
```

## Очистить все данные:
```javascript
localStorage.clear();
console.log('Все данные очищены');
```

## Проверить все ключи localStorage:
```javascript
Object.keys(localStorage).filter(key => key.includes('schedule')).forEach(key => {
  console.log(key + ':', localStorage.getItem(key));
});
```