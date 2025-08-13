import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const useSocket = (namespace) => {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const newSocket = io(`http://localhost:5001${namespace}`, {
      query: { token },
      transports: ['websocket'],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log(`Socket connected to ${namespace}`);
    });

    newSocket.on('disconnect', () => {
      console.log(`Socket disconnected from ${namespace}`);
    });

    newSocket.on('error', (error) => {
      console.error(`Socket error in ${namespace}:`, error);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [namespace]);

  const emitEvent = (eventName, data) => {
    if (socketRef.current) {
      socketRef.current.emit(eventName, data);
    }
  };

  const onEvent = (eventName, callback) => {
    if (socketRef.current) {
      socketRef.current.on(eventName, callback);
    }
  };

  const offEvent = (eventName, callback) => {
    if (socketRef.current) {
      socketRef.current.off(eventName, callback);
    }
  };

  return { socket, emitEvent, onEvent, offEvent };
};

export default useSocket;
