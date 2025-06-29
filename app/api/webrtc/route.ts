import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// In-memory storage for WebRTC signaling (in production, use WebSocket or Socket.io)
const signalingData = new Map<string, {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  iceCandidates: RTCIceCandidateInit[];
}>();

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authorization.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { callId, type, data } = await request.json();

    if (!callId || !type) {
      return NextResponse.json(
        { error: 'Call ID and type are required' },
        { status: 400 }
      );
    }

    if (!signalingData.has(callId)) {
      signalingData.set(callId, { iceCandidates: [] });
    }

    const callSignaling = signalingData.get(callId)!;

    switch (type) {
      case 'offer':
        callSignaling.offer = data;
        break;
      case 'answer':
        callSignaling.answer = data;
        break;
      case 'ice-candidate':
        callSignaling.iceCandidates.push(data);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid signaling type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WebRTC signaling error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
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
    const type = searchParams.get('type');

    if (!callId || !type) {
      return NextResponse.json(
        { error: 'Call ID and type are required' },
        { status: 400 }
      );
    }

    const callSignaling = signalingData.get(callId);
    if (!callSignaling) {
      return NextResponse.json(
        { error: 'Call signaling not found' },
        { status: 404 }
      );
    }

    switch (type) {
      case 'offer':
        return NextResponse.json({ data: callSignaling.offer });
      case 'answer':
        return NextResponse.json({ data: callSignaling.answer });
      case 'ice-candidates':
        return NextResponse.json({ data: callSignaling.iceCandidates });
      default:
        return NextResponse.json(
          { error: 'Invalid signaling type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('WebRTC signaling error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
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

    signalingData.delete(callId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WebRTC signaling cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 