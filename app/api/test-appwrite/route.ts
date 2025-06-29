import { NextRequest, NextResponse } from 'next/server';
import { storage, MEDIA_BUCKET_ID } from '@/lib/appwrite';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Appwrite connection...');
    console.log('Bucket ID:', MEDIA_BUCKET_ID);
    console.log('Has API Key:', !!process.env.APPWRITE_API_KEY);
    
    // Test listing files in the bucket
    const files = await storage.listFiles(MEDIA_BUCKET_ID);
    
    return NextResponse.json({
      success: true,
      message: 'Appwrite connection successful',
      bucketId: MEDIA_BUCKET_ID,
      fileCount: files.files.length,
      hasApiKey: !!process.env.APPWRITE_API_KEY
    });
  } catch (error) {
    console.error('Appwrite test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      bucketId: MEDIA_BUCKET_ID,
      hasApiKey: !!process.env.APPWRITE_API_KEY
    }, { status: 500 });
  }
} 