import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { Conversation, User } from '@/models/index';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    const conversation = await Conversation.findById(conversationId)
      .populate('participants', 'name email avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar isOnline' }
      });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Debug information
    const debugInfo = {
      conversationId: conversation._id,
      participants: conversation.participants,
      currentUserId: decoded.userId,
      participantIds: conversation.participants.map((p: any) => p._id),
      otherParticipant: conversation.participants.find((p: any) => p._id !== decoded.userId),
      isCurrentUserInParticipants: conversation.participants.some((p: any) => p._id === decoded.userId),
      participantCount: conversation.participants.length,
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 