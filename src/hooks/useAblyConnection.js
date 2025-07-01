import { useState, useRef, useEffect } from 'react';
import * as Ably from 'ably';

export const useAblyConnection = (settings, schedule, cellTags, onScheduleUpdate, onSettingsUpdate, onCellTagsUpdate, onAuthStateUpdate) => {
  const ablyClient = useRef(null);
  const channel = useRef(null);
  const myClientId = useRef(null);
  const lastUpdateTimestamps = useRef({
    schedule: null,
    settings: null,
    cellTags: null
  });
  
  const [connectionState, setConnectionState] = useState('disconnected');
  const [onlineUsers, setOnlineUsers] = useState(new Set());


  const connectToAbly = async () => {
    if (!settings.websocket.enabled || 
        !settings.websocket.apiKey.trim() || 
        !settings.websocket.roomId.trim()) {
      setConnectionState('disconnected');
      return;
    }

    try {
      setConnectionState('connecting');
      
      myClientId.current = `user-${Math.random().toString(36).substr(2, 9)}`;
      
      ablyClient.current = new Ably.Realtime({
        key: settings.websocket.apiKey,
        clientId: myClientId.current,
        recover: true
      });

      ablyClient.current.connection.on('connected', () => {
        setConnectionState('connected');
        
        // Запрашиваем существующие данные при подключении
        setTimeout(() => {
          requestExistingData();
        }, 1000); // Задержка для стабилизации подключения
      });

      ablyClient.current.connection.on('disconnected', () => {
        setConnectionState('disconnected');
      });

      ablyClient.current.connection.on('failed', () => {
        setConnectionState('failed');
      });

      const roomId = settings.websocket.roomId.trim();
      channel.current = ablyClient.current.channels.get(roomId);


      channel.current.subscribe('schedule-update', (message) => {
        if (message.data && message.data.schedule && message.data.userId !== myClientId.current) {
          const messageTimestamp = new Date(message.data.timestamp);
          const lastTimestamp = lastUpdateTimestamps.current.schedule;
          
          // Применяем обновление только если оно новее последнего
          if (!lastTimestamp || messageTimestamp > lastTimestamp) {
            lastUpdateTimestamps.current.schedule = messageTimestamp;
            onScheduleUpdate(message.data.schedule);
          }
        }
      });

      channel.current.subscribe('settings-update', (message) => {
        if (message.data && message.data.settings && message.data.userId !== myClientId.current) {
          const messageTimestamp = new Date(message.data.timestamp);
          const lastTimestamp = lastUpdateTimestamps.current.settings;
          
          // Применяем обновление только если оно новее последнего
          if (!lastTimestamp || messageTimestamp > lastTimestamp) {
            lastUpdateTimestamps.current.settings = messageTimestamp;
            onSettingsUpdate(message.data.settings);
          }
        }
      });

      channel.current.subscribe('celltags-update', (message) => {
        if (message.data && message.data.cellTags && message.data.userId !== myClientId.current) {
          const messageTimestamp = new Date(message.data.timestamp);
          const lastTimestamp = lastUpdateTimestamps.current.cellTags;
          
          // Применяем обновление только если оно новее последнего
          if (!lastTimestamp || messageTimestamp > lastTimestamp) {
            lastUpdateTimestamps.current.cellTags = messageTimestamp;
            onCellTagsUpdate(message.data.cellTags);
          }
        }
      });

      channel.current.subscribe('auth-state-update', (message) => {
        if (message.data && message.data.userId !== myClientId.current && onAuthStateUpdate) {
          onAuthStateUpdate(message.data.isAuthenticated, message.data.admins);
        }
      });

      channel.current.subscribe('test-message', (message) => {
        // Test message received
      });

      // Слушаем запросы данных от новых пользователей
      channel.current.subscribe('data-request', (message) => {
        if (message.data && message.data.userId !== myClientId.current) {
          // Отправляем текущие данные запросившему пользователю
          sendDataResponse();
        }
      });

      // Слушаем ответы с данными
      channel.current.subscribe('data-response', (message) => {
        if (message.data && message.data.userId !== myClientId.current) {
          handleDataResponse(message.data);
        }
      });

      channel.current.subscribe('push-notification', (message) => {
        if (message.data && message.data.userId !== myClientId.current) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(message.data.title || 'Уведомление', {
              body: message.data.message || '',
              icon: '/icon.svg',
              tag: 'schedule-update',
              badge: '/icon32.png'
            });
          }
        }
      });

      channel.current.presence.enter({ 
        username: `Пользователь ${Math.floor(Math.random() * 1000)}`,
        joinedAt: new Date().toISOString()
      });

      channel.current.presence.subscribe(() => {
        channel.current.presence.get((err, members) => {
          if (!err && Array.isArray(members)) {
            setOnlineUsers(new Set(members.map(member => member.data.username)));
          }
        });
      });

    } catch (error) {
      setConnectionState('failed');
    }
  };

  const disconnectFromAbly = () => {
    if (channel.current) {
      try {
        if (channel.current.state === 'attached') {
          channel.current.presence.leave();
        }
        channel.current.unsubscribe();
        channel.current.detach();
      } catch (error) {
        // Connection cleanup - ignore errors during disconnect
      }
      channel.current = null;
    }

    if (ablyClient.current) {
      try {
        if (ablyClient.current.connection.state !== 'closed') {
          ablyClient.current.close();
        }
      } catch (error) {
        // Client cleanup - ignore errors during disconnect
      }
      ablyClient.current = null;
    }

    myClientId.current = null;
    setConnectionState('disconnected');
    setOnlineUsers(new Set());
  };

  const publishScheduleUpdate = (newSchedule) => {
    if (channel.current && connectionState === 'connected' && channel.current.state === 'attached') {
      const timestamp = new Date();
      const message = {
        schedule: newSchedule,
        timestamp: timestamp.toISOString(),
        userId: myClientId.current
      };
      
      // Обновляем локальную временную метку
      lastUpdateTimestamps.current.schedule = timestamp;
      
      channel.current.publish('schedule-update', message).catch(() => {
        // Handle publish error silently
      });
    }
  };

  const publishSettingsUpdate = (newSettings) => {
    if (channel.current && connectionState === 'connected' && channel.current.state === 'attached') {
      const timestamp = new Date();
      const message = {
        settings: {
          employees: newSettings.employees,
          positions: newSettings.positions,
          shiftTypes: newSettings.shiftTypes,
          tags: newSettings.tags,
          workingHours: newSettings.workingHours
        },
        timestamp: timestamp.toISOString(),
        userId: myClientId.current
      };
      
      // Обновляем локальную временную метку
      lastUpdateTimestamps.current.settings = timestamp;
      
      channel.current.publish('settings-update', message);
    }
  };

  const publishCellTagsUpdate = (newCellTags) => {
    if (channel.current && connectionState === 'connected' && channel.current.state === 'attached') {
      const timestamp = new Date();
      const message = {
        cellTags: newCellTags,
        timestamp: timestamp.toISOString(),
        userId: myClientId.current
      };
      
      // Обновляем локальную временную метку
      lastUpdateTimestamps.current.cellTags = timestamp;
      
      channel.current.publish('celltags-update', message);
    }
  };

  const sendTestMessage = () => {
    if (channel.current && connectionState === 'connected' && channel.current.state === 'attached') {
      const testMessage = {
        test: true,
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      channel.current.publish('test-message', testMessage);
    }
  };

  const sendPushNotification = (title, message) => {
    if (channel.current && connectionState === 'connected' && channel.current.state === 'attached') {
      const notificationData = {
        title,
        message,
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      channel.current.publish('push-notification', notificationData);
    }
  };

  const requestExistingData = () => {
    if (channel.current && connectionState === 'connected' && channel.current.state === 'attached') {
      const requestData = {
        type: 'request',
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      channel.current.publish('data-request', requestData);
    }
  };

  const sendDataResponse = () => {
    if (channel.current && connectionState === 'connected' && channel.current.state === 'attached') {
      const responseData = {
        type: 'response',
        timestamp: new Date().toISOString(),
        userId: myClientId.current,
        data: {
          settings: settings,
          schedule: schedule,
          cellTags: cellTags
        }
      };
      channel.current.publish('data-response', responseData);
    }
  };

  const handleDataResponse = (responseData) => {
    if (responseData && responseData.data) {
      const { settings: receivedSettings, schedule: receivedSchedule, cellTags: receivedCellTags } = responseData.data;
      
      // Проверяем, есть ли у нас локальные данные (не дефолтные)
      const hasLocalSchedule = Object.keys(schedule).length > 0;
      const hasLocalTags = Object.keys(cellTags).length > 0;
      
      // Проверяем, изменились ли настройки от дефолтных
      const hasLocalSettings = settings.employees && (
        // Есть сотрудники с должностями (новая структура)
        settings.employees.some(emp => typeof emp === 'object' && emp.position) ||
        // Или есть пользовательские типы смен
        Object.keys(settings.shiftTypes || {}).length > 8 ||
        // Или есть пользовательские теги
        Object.keys(settings.tags || {}).length > 3 ||
        // Или есть пользовательские должности
        (settings.positions && settings.positions.length > 0)
      );
      
      // Определяем, есть ли у нас значимые локальные данные
      const hasLocalData = hasLocalSettings || hasLocalSchedule || hasLocalTags;
      
      // Если у нас нет значимых локальных данных, применяем полученные
      if (!hasLocalData && receivedSettings) {
        onSettingsUpdate(receivedSettings);
      }
      
      if (!hasLocalData && receivedSchedule && Object.keys(receivedSchedule).length > 0) {
        onScheduleUpdate(receivedSchedule);
      }
      
      if (!hasLocalData && receivedCellTags && Object.keys(receivedCellTags).length > 0) {
        onCellTagsUpdate(receivedCellTags);
      }
    }
  };

  useEffect(() => {
    // Только отключаемся и переподключаемся если изменились критичные настройки
    const shouldConnect = settings.websocket.enabled && 
                          settings.websocket.apiKey.trim() && 
                          settings.websocket.roomId.trim();
    
    const currentApiKey = ablyClient.current?.options?.key;
    const currentRoomId = channel.current?.name;
    
    // Проверяем, нужно ли пересоздавать подключение
    const needsReconnect = shouldConnect && (
      !ablyClient.current || 
      currentApiKey !== settings.websocket.apiKey ||
      currentRoomId !== settings.websocket.roomId.trim() ||
      connectionState === 'failed'
    );
    
    if (!shouldConnect && (ablyClient.current || channel.current)) {
      // Отключаемся если websocket выключен
      disconnectFromAbly();
    } else if (needsReconnect) {
      // Пересоздаем подключение только при необходимости
      disconnectFromAbly();
      const timer = setTimeout(() => {
        connectToAbly();
      }, 100);
      
      return () => {
        clearTimeout(timer);
      };
    }
    
    return () => {
      // Cleanup при размонтировании компонента
      if (!shouldConnect) {
        disconnectFromAbly();
      }
    };
  }, [settings.websocket.enabled, settings.websocket.apiKey, settings.websocket.roomId]);

  const publishAuthStateUpdate = (isAuthenticated, admins) => {
    if (channel.current && connectionState === 'connected' && channel.current.state === 'attached') {
      const message = {
        isAuthenticated,
        admins,
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      channel.current.publish('auth-state-update', message);
    }
  };

  return {
    connectionState,
    onlineUsers,
    publishScheduleUpdate,
    publishSettingsUpdate,
    publishCellTagsUpdate,
    publishAuthStateUpdate,
    sendTestMessage,
    sendPushNotification,
    requestExistingData
  };
};