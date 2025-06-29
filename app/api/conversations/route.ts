import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { Conversation, User, Message } from '@/models/index';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('MongoDB connected successfully');
    
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      console.log('No authorization header found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    console.log('Verifying token...');
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('Invalid token');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    console.log('Token verified for user:', decoded.userId);

    console.log('Fetching conversations...');
    const conversations = await Conversation.find({
      participants: { $in: [decoded.userId] },
      $expr: { $eq: [{ $size: '$participants' }, 2] }
    })
    .populate('participants', 'name avatar isOnline')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'name avatar isOnline' }
    })
    .sort({ lastMessageAt: -1 });

    console.log('Found conversations:', conversations.length);
    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    
    // Provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes('MongoNetworkError') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { error: 'Database connection failed. Please check if MongoDB is running.' },
          { status: 500 }
        );
      }
      if (error.message.includes('MONGODB_URI')) {
        return NextResponse.json(
          { error: 'Database configuration error. Please check MONGODB_URI environment variable.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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

    const { participantId } = await request.json();

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      );
    }

    // Prevent creating conversation with self
    if (participantId === decoded.userId) {
      return NextResponse.json(
        { error: 'Cannot create conversation with yourself' },
        { status: 400 }
      );
    }

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      participants: { 
        $all: [decoded.userId, participantId],
        $size: 2
      }
    });

    if (existingConversation) {
      // Always re-fetch with full population
      const populated = await Conversation.findById(existingConversation._id)
        .populate('participants', 'name avatar isOnline')
        .populate({
          path: 'lastMessage',
          populate: { path: 'sender', select: 'name avatar isOnline' }
        });
      return NextResponse.json(populated);
    }

    // Create new conversation with unique participants
    const participants = [decoded.userId, participantId].filter((id, index, arr) => arr.indexOf(id) === index);
    
    const conversation = await Conversation.create({
      participants,
    });

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'name avatar isOnline')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'name avatar isOnline' }
      });

    console.log('DEBUG: Returning conversation:', populatedConversation);

    if (!populatedConversation || !populatedConversation.participants || populatedConversation.participants.length !== 2) {
      return NextResponse.json(
        { error: 'Failed to create a valid conversation with two participants.' },
        { status: 500 }
      );
    }

    return NextResponse.json(populatedConversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}