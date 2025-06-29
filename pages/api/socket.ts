import { NextApiRequest, NextApiResponse } from 'next';
import { io } from '@/lib/socket';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if ((res.socket as any).server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  console.log('Setting up socket');
  (res.socket as any).server.io = io;
  res.end();
} 