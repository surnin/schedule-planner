import { useState, useRef, useEffect } from 'react';
import * as Ably from 'ably';

export const useAblyConnection = (settings, schedule, cellTags, onScheduleUpdate, onSettingsUpdate, onCellTagsUpdate, onAuthStateUpdate) => {
  const ablyClient = useRef(null);
  const channel = useRef(null);
  const myClientId = useRef(null);
  
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
          onScheduleUpdate(message.data.schedule);
        }
      });

      channel.current.subscribe('settings-update', (message) => {
        if (message.data && message.data.settings && message.data.userId !== myClientId.current) {
          onSettingsUpdate(message.data.settings);
        }
      });

      channel.current.subscribe('celltags-update', (message) => {
        if (message.data && message.data.cellTags && message.data.userId !== myClientId.current) {
          onCellTagsUpdate(message.data.cellTags);
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
      const message = {
        schedule: newSchedule,
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      
      channel.current.publish('schedule-update', message).catch(() => {
        // Handle publish error silently
      });
    }
  };

  const publishSettingsUpdate = (newSettings) => {
    if (channel.current && connectionState === 'connected' && channel.current.state === 'attached') {
      const message = {
        settings: {
          employees: newSettings.employees,
          shiftTypes: newSettings.shiftTypes,
          tags: newSettings.tags
        },
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
      channel.current.publish('settings-update', message);
    }
  };

  const publishCellTagsUpdate = (newCellTags) => {
    if (channel.current && connectionState === 'connected' && channel.current.state === 'attached') {
      const message = {
        cellTags: newCellTags,
        timestamp: new Date().toISOString(),
        userId: myClientId.current
      };
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
    sendPushNotification
  };
};