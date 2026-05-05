import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    const defaultSocketUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:5500'
      : `http://${window.location.hostname}:5500`;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || defaultSocketUrl;
    const s = io(socketUrl, { transports: ['websocket'] });
    s.on('connect', () => {
      s.emit('join', user.id);
    });
    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?.id]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
