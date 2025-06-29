import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/models/index';
import { verifyToken } from '@/lib/auth';
import { FilterQuery } from 'mongoose';

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
    const search = searchParams.get('search');

    // Always exclude the current user from results
    let query: FilterQuery<any> = { _id: { $ne: decoded.userId } };
    
    if (search && search.trim()) {
      query = {
        ...query,
        $or: [
          { name: { $regex: search.trim(), $options: 'i' } },
          { email: { $regex: search.trim(), $options: 'i' } },
        ],
      };
    }

    const users = await User.find(query)
      .select('name email avatar isOnline lastSeen')
      .limit(20)
      .sort({ name: 1 });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}