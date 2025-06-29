import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest } from 'next';
import { verifyToken } from './auth';
import { IUser } from '@/models/User';
import User from '@/models/User';

export interface SocketServer extends NetServer {
  io?: SocketIOServer;
}

export interface AuthenticatedSocket {
  userId: string;
  user: IUser;
}

const io = new SocketIOServer({
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store connected users
const connectedUsers = new Map<string, string>(); // userId -> socketId

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }

    // Get user data
    const user = await User.findById(decoded.userId).select('name email avatar isOnline');
    if (!user) {
      return next(new Error('User not found'));
    }

    // Update user online status
    await User.findByIdAndUpdate(decoded.userId, { 
      isOnline: true,
      lastSeen: new Date()
    });

    socket.data.userId = decoded.userId;
    socket.data.user = user;
    
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  const user = socket.data.user;

  console.log(`User connected: ${user.name} (${userId})`);
  
  // Store connected user
  connectedUsers.set(userId, socket.id);

  // Join user to their personal room
  socket.join(`user:${userId}`);

  // Broadcast user online status
  socket.broadcast.emit('user:online', { userId, user });

  // Handle joining conversation
  socket.on('join:conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`User ${user.name} joined conversation: ${conversationId}`);
  });

  // Handle leaving conversation
  socket.on('leave:conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
    console.log(`User ${user.name} left conversation: ${conversationId}`);
  });

  // Handle new message
  socket.on('message:send', (data) => {
    const { conversationId, message } = data;
    
    // Broadcast message to conversation room
    socket.to(`conversation:${conversationId}`).emit('message:receive', {
      conversationId,
      message: {
        ...message,
        sender: user
      }
    });
    
    console.log(`Message sent in conversation ${conversationId} by ${user.name}`);
  });

  // Handle typing indicator
  socket.on('typing:start', (data) => {
    const { conversationId } = data;
    socket.to(`conversation:${conversationId}`).emit('typing:start', {
      conversationId,
      userId,
      userName: user.name
    });
  });

  socket.on('typing:stop', (data) => {
    const { conversationId } = data;
    socket.to(`conversation:${conversationId}`).emit('typing:stop', {
      conversationId,
      userId
    });
  });

  // Handle call signaling
  socket.on('call:offer', (data) => {
    const { receiverId, offer, callType } = data;
    console.log(`Call offer from ${user.name} to ${receiverId}`, { callType, offer });
    
    // Send call offer to the receiver
    socket.to(`user:${receiverId}`).emit('call:offer', {
      callerId: userId,
      caller: user,
      offer,
      callType,
      callId: `${userId}-${receiverId}-${Date.now()}`
    });
  });

  socket.on('call:answer', (data) => {
    const { callerId, answer } = data;
    console.log(`Call answer from ${user.name} to ${callerId}`, { answer });
    
    // Send call answer to the caller
    socket.to(`user:${callerId}`).emit('call:answer', {
      receiverId: userId,
      receiver: user,
      answer
    });
  });

  socket.on('call:ice-candidate', (data) => {
    const { targetId, candidate } = data;
    console.log(`ICE candidate from ${user.name} to ${targetId}`);
    
    // Send ICE candidate to the target
    socket.to(`user:${targetId}`).emit('call:ice-candidate', {
      senderId: userId,
      candidate
    });
  });

  socket.on('call:end', (data) => {
    const { targetId } = data;
    console.log(`Call end from ${user.name} to ${targetId}`);
    
    // Send call end to the target
    socket.to(`user:${targetId}`).emit('call:end', {
      senderId: userId
    });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${user.name} (${userId})`);
    
    // Remove from connected users
    connectedUsers.delete(userId);
    
    // Update user offline status
    try {
      await User.findByIdAndUpdate(userId, { 
        isOnline: false,
        lastSeen: new Date()
      });
      
      // Broadcast user offline status
      socket.broadcast.emit('user:offline', { userId, user });
    } catch (error) {
      console.error('Error updating user offline status:', error);
    }
  });
});

export { io }; 