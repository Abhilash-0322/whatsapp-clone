import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  token: string;
  onMessage?: (message: any) => void;
  onUserOnline?: (data: any) => void;
  onUserOffline?: (data: any) => void;
  onTypingStart?: (data: any) => void;
  onTypingStop?: (data: any) => void;
  onCallOffer?: (data: any) => void;
  onCallAnswer?: (data: any) => void;
  onCallIceCandidate?: (data: any) => void;
  onCallEnd?: (data: any) => void;
}

export function useSocket({
  token,
  onMessage,
  onUserOnline,
  onUserOffline,
  onTypingStart,
  onTypingStop,
  onCallOffer,
  onCallAnswer,
  onCallIceCandidate,
  onCallEnd,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Message events
    socket.on('message:receive', (data) => {
      onMessage?.(data);
    });

    // User status events
    socket.on('user:online', (data) => {
      onUserOnline?.(data);
    });

    socket.on('user:offline', (data) => {
      onUserOffline?.(data);
    });

    // Typing events
    socket.on('typing:start', (data) => {
      onTypingStart?.(data);
    });

    socket.on('typing:stop', (data) => {
      onTypingStop?.(data);
    });

    // Call events
    socket.on('call:offer', (data) => {
      onCallOffer?.(data);
    });

    socket.on('call:answer', (data) => {
      onCallAnswer?.(data);
    });

    socket.on('call:ice-candidate', (data) => {
      onCallIceCandidate?.(data);
    });

    socket.on('call:end', (data) => {
      onCallEnd?.(data);
    });

    socketRef.current = socket;
  }, [token, onMessage, onUserOnline, onUserOffline, onTypingStart, onTypingStop, onCallOffer, onCallAnswer, onCallIceCandidate, onCallEnd]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:conversation', conversationId);
    }
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave:conversation', conversationId);
    }
  }, []);

  const sendMessage = useCallback((conversationId: string, message: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:send', { conversationId, message });
    }
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:start', { conversationId });
    }
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:stop', { conversationId });
    }
  }, []);

  const sendCallOffer = useCallback((receiverId: string, offer: any, callType: 'audio' | 'video') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('call:offer', { receiverId, offer, callType });
    }
  }, []);

  const sendCallAnswer = useCallback((callerId: string, answer: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('call:answer', { callerId, answer });
    }
  }, []);

  const sendCallIceCandidate = useCallback((targetId: string, candidate: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('call:ice-candidate', { targetId, candidate });
    }
  }, []);

  const sendCallEnd = useCallback((targetId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('call:end', { targetId });
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    sendCallOffer,
    sendCallAnswer,
    sendCallIceCandidate,
    sendCallEnd,
  };
} 