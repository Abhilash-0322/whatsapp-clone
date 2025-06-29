import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { User } from '@/models/index';

export const dynamic = 'force-dynamic';

// In-memory storage for active calls (in production, use Redis or database)
const activeCalls = new Map<string, {
  callerId: string;
  receiverId: string;
  callType: 'audio' | 'video';
  status: 'ringing' | 'connected' | 'ended';
  startTime: Date;
}>();

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

    const { receiverId, callType } = await request.json();

    if (!receiverId || !callType) {
      return NextResponse.json(
        { error: 'Receiver ID and call type are required' },
        { status: 400 }
      );
    }

    if (!['audio', 'video'].includes(callType)) {
      return NextResponse.json(
        { error: 'Invalid call type. Must be "audio" or "video"' },
        { status: 400 }
      );
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      );
    }

    // Check if receiver is online
    if (!receiver.isOnline) {
      return NextResponse.json(
        { error: 'Receiver is offline' },
        { status: 400 }
      );
    }

    // Check if there's already an active call
    const existingCall = Array.from(activeCalls.values()).find(
      call => (call.callerId === decoded.userId || call.receiverId === decoded.userId) &&
              call.status === 'ringing'
    );

    if (existingCall) {
      return NextResponse.json(
        { error: 'You already have an active call' },
        { status: 400 }
      );
    }

    // Create call ID
    const callId = `${decoded.userId}-${receiverId}-${Date.now()}`;

    // Store call information
    activeCalls.set(callId, {
      callerId: decoded.userId,
      receiverId,
      callType,
      status: 'ringing',
      startTime: new Date(),
    });

    // Get caller information
    const caller = await User.findById(decoded.userId).select('name avatar');

    return NextResponse.json({
      callId,
      caller: {
        id: caller._id,
        name: caller.name,
        avatar: caller.avatar,
      },
      receiver: {
        id: receiver._id,
        name: receiver.name,
        avatar: receiver.avatar,
      },
      callType,
      status: 'ringing',
    });
  } catch (error) {
    console.error('Create call error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const callId = searchParams.get('callId');

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      );
    }

    const call = activeCalls.get(callId);
    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Check if user is part of this call
    if (call.callerId !== decoded.userId && call.receiverId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to call' },
        { status: 403 }
      );
    }

    return NextResponse.json(call);
  } catch (error) {
    console.error('Get call error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const { callId, action } = await request.json();

    if (!callId || !action) {
      return NextResponse.json(
        { error: 'Call ID and action are required' },
        { status: 400 }
      );
    }

    const call = activeCalls.get(callId);
    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Check if user is part of this call
    if (call.callerId !== decoded.userId && call.receiverId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to call' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'accept':
        if (call.status === 'ringing' && call.receiverId === decoded.userId) {
          call.status = 'connected';
          activeCalls.set(callId, call);
        }
        break;
      case 'reject':
      case 'end':
        call.status = 'ended';
        activeCalls.set(callId, call);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, call });
  } catch (error) {
    console.error('Update call error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 