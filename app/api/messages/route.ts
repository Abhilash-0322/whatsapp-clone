import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { User, Message, Conversation } from '@/models/index';

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
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { conversationId, content, messageType = 'text', mediaUrl, fileName } = await request.json();

    if (!conversationId || (!content && !mediaUrl)) {
      return NextResponse.json(
        { error: 'Conversation ID and content or media are required' },
        { status: 400 }
      );
    }

    const messageData: any = {
      conversation: conversationId,
      sender: decoded.userId,
      messageType,
      readBy: [{ user: decoded.userId }],
    };

    if (content) {
      messageData.content = content;
    }

    if (mediaUrl) {
      messageData.mediaUrl = mediaUrl;
    }

    if (fileName) {
      messageData.fileName = fileName;
    }

    const message = await Message.create(messageData);

    // Update conversation's last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageAt: new Date(),
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar');

    return NextResponse.json(populatedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}