import { useState, useRef, useEffect } from 'react';
import * as Ably from 'ably';

export const useAblyConnection = (settings, schedule, cellTags, onScheduleUpdate, onSettingsUpdate, onCellTagsUpdate, onAuthStateUpdate) => {
  const ablyClient = useRef(null);
  const channel = useRef(null);
  const myClientId = useRef(null);
  
  const [connectionState, setConnectionState] = useState('disconnected');
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const debugLog = (message, ...args) => {
    if (settings.debug) {
      console.log(message, ...args);
    }
  };

  const connectToAbly = async () => {
    if (!settings.websocket.enabled || 
        !settings.websocket.apiKey.trim() || 
        !settings.websocket.roomId.trim()) {
      debugLog('Недостаточно данных для подключения к Ably');
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
        debugLog('Подключено к Ably. Client ID:', myClientId.current);
        debugLog('Room ID:', settings.websocket.roomId);
      });

      ablyClient.current.connection.on('disconnected', () => {
        setConnectionState('disconnected');
        debugLog('Отключено от Ably');
      });

      ablyClient.current.connection.on('failed', (error) => {
        setConnectionState('failed');
        console.error('Ошибка подключения к Ably:', error);
      });

      const roomId = settings.websocket.roomId.trim();
      channel.current = ablyClient.current.channels.get(roomId);
      debugLog('Подключаемся к каналу:', roomId);

      channel.current.on('attached', () => {
        debugLog('✅ Канал подключен и готов к работе');
      });

      channel.current.on('failed', (err) => {
        console.error('❌ Ошибка канала:', err);
      });

      channel.current.subscribe('schedule-update', (message) => {
        debugLog('📨 Получено обновление расписания:', message.data);
        debugLog('👤 От пользователя:', message.data?.userId, 'Мой ID:', myClientId.current);
        if (message.data && message.data.schedule && message.data.userId !== myClientId.current) {
          debugLog('✅ Применяем изменения расписания от другого пользователя');
          onScheduleUpdate(message.data.schedule);
        } else {
          debugLog('⏭️ Игнорируем собственное сообщение');
        }
      });

      channel.current.subscribe('settings-update', (message) => {
        debugLog('Получено обновление настроек:', message.data);
        if (message.data && message.data.settings && message.data.userId !== myClientId.current) {
          debugLog('Применяем изменения настроек от другого пользователя');
          onSettingsUpdate(message.data.settings);
        }
      });

      channel.current.subscribe('celltags-update', (message) => {
        debugLog('Получено обновление тегов ячеек:', message.data);
        if (message.data && message.data.cellTags && message.data.userId !== myClientId.current) {
          debugLog('Применяем изменения тегов ячеек от другого пользователя');
          onCellTagsUpdate(message.data.cellTags);
        }
      });

      // Новый канал для синхронизации состояния аутентификации
      channel.current.subscribe('auth-state-update', (message) => {
        debugLog('Получено обновление состояния аутентификации:', message.data);
        if (message.data && message.data.userId !== myClientId.current && onAuthStateUpdate) {
          debugLog('Применяем изменения состояния аутентификации от другого пользователя');
          onAuthStateUpdate(message.data.isAuthenticated, message.data.admins);
        }
      });

      channel.current.subscribe('test-message', (message) => {
        debugLog('🧪 Получено тестовое сообщение:', message.data);
        if (message.data.userId !== myClientId.current) {
          debugLog('✅ Тест синхронизации прошел успешно!');
        }
      });

      channel.current.subscribe('push-notification', (message) => {
        debugLog('📱 Получено push уведомление:', message.data);
        if (message.data && message.data.userId !== myClientId.current) {
          debugLog('✅ Показываем push уведомление от другого пользователя');
          // Показываем уведомление
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
      console.error('Ошибка при подключении к Ably:', error);
      setConnectionState('failed');
    }
  };

  const disconnectFromAbly = () => {
    if (channel.current) {
      try {
        channel.current.presence.leave();
        channel.current.unsubscribe();
      } catch (error) {
        debugLog('Ошибка при отключении канала (норм):', error.message);
      }
      channel.current = null;
    }

    if (ablyClient.current) {
      try {
        ablyClient.current.close();
      } catch (error) {
        debugLog('Ошибка при закрытии клиента (норм):', error.message);
      }
      ablyClient.current = null;
    }

    myClientId.current = null;
    setConnectionState('disconnected');
    setOnlineUsers(new Set());
  };

  const publishScheduleUpdate = (newSchedule) => {
    debugLog('🔄 Попытка отправки обновления расписания');
    debugLog('📊 State - channel:', !!channel.current, 'connected:', connectionState === 'connected');
    
    if (channel.current && connectionState === 'connected') {
      const message = {
        schedule: newSchedule,
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      debugLog('📤 Отправляем обновление расписания:', message);
      
      channel.current.publish('schedule-update', message).then(() => {
        debugLog('✅ Сообщение успешно отправлено');
      }).catch((error) => {
        console.error('❌ Ошибка отправки сообщения:', error);
      });
    } else {
      debugLog('❌ Не можем отправить: канал не готов или не подключен');
    }
  };

  const publishSettingsUpdate = (newSettings) => {
    if (channel.current && connectionState === 'connected') {
      const message = {
        settings: {
          employees: newSettings.employees,
          shiftTypes: newSettings.shiftTypes,
          tags: newSettings.tags
        },
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      debugLog('Отправляем обновление настроек:', message);
      channel.current.publish('settings-update', message);
    }
  };

  const publishCellTagsUpdate = (newCellTags) => {
    if (channel.current && connectionState === 'connected') {
      const message = {
        cellTags: newCellTags,
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      debugLog('Отправляем обновление тегов ячеек:', message);
      channel.current.publish('celltags-update', message);
    }
  };

  const sendTestMessage = () => {
    if (channel.current && connectionState === 'connected') {
      const testMessage = {
        test: true,
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      debugLog('🧪 Отправляем тестовое сообщение');
      channel.current.publish('test-message', testMessage);
    }
  };

  const sendPushNotification = (title, message) => {
    if (channel.current && connectionState === 'connected') {
      const notificationData = {
        title,
        message,
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      debugLog('📱 Отправляем push уведомление через WebSocket:', notificationData);
      channel.current.publish('push-notification', notificationData);
    } else {
      debugLog('❌ Не можем отправить push уведомление: канал не готов');
    }
  };

  useEffect(() => {
    disconnectFromAbly();
    
    if (settings.websocket.enabled && 
        settings.websocket.apiKey.trim() && 
        settings.websocket.roomId.trim()) {
      const timer = setTimeout(() => {
        connectToAbly();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        disconnectFromAbly();
      };
    }
    
    return () => {
      disconnectFromAbly();
    };
  }, [settings.websocket.enabled, settings.websocket.apiKey, settings.websocket.roomId]);

  const publishAuthStateUpdate = (isAuthenticated, admins) => {
    if (channel.current && connectionState === 'connected') {
      const message = {
        isAuthenticated,
        admins,
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      debugLog('📡 Отправляем обновление состояния аутентификации:', message);
      channel.current.publish('auth-state-update', message);
    } else {
      debugLog('❌ Не можем отправить обновление состояния аутентификации: канал не готов');
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
    sendPushNotification
  };
};