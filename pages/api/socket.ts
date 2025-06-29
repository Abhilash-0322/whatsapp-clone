import { NextApiRequest, NextApiResponse } from 'next';
import { io } from '@/lib/socket';
import { NextApiResponseWithSocket } from '@/lib/socket';

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  console.log('Setting up socket');
  res.socket.server.io = io;
  res.end();
} 