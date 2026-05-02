import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { API_BASE } from '../constants';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('cms_token');
    if (!token) {
      console.warn('No token – Socket.io will not connect');
      return;
    }

    // Use polling transport only (works on Render without extra config)
    const newSocket = io(API_BASE, {
      path: '/socket.io',
      transports: ['polling'],      // force polling (no WebSocket)
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket.io connected (polling)');
      setIsConnected(true);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
      console.error('Full error:', err);
      setIsConnected(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Optional: show a small indicator in the console when real‑time is disabled
  if (socket && !isConnected) {
    console.warn('Real‑time updates may be delayed – polling fallback active');
  }

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};