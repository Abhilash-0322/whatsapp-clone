import { NextRequest, NextResponse } from 'next/server';
import { storage, MEDIA_BUCKET_ID } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    // Check if Appwrite is properly configured
    if (!process.env.APPWRITE_API_KEY) {
      return NextResponse.json({ 
        error: 'Appwrite API key not configured',
        message: 'Please add APPWRITE_API_KEY to your environment variables'
      }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large',
        message: 'Maximum file size is 10MB'
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'File type not allowed',
        message: 'Only images, PDFs, and documents are allowed'
      }, { status: 400 });
    }

    // Convert File to Buffer for Appwrite
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique file ID
    const fileId = ID.unique();

    console.log('Uploading file:', {
      fileId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      bucketId: MEDIA_BUCKET_ID,
      hasApiKey: !!process.env.APPWRITE_API_KEY
    });

    // Create a new client instance with API key for this request
    const { Client, Storage } = await import('appwrite');
    const uploadClient = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '686128d40026a67171fb');

    const uploadStorage = new Storage(uploadClient);

    // Upload to Appwrite using the authenticated client
    const uploadedFile = await uploadStorage.createFile(
      MEDIA_BUCKET_ID,
      fileId,
      new File([buffer], file.name, { type: file.type })
    );

    // Get file URL
    const fileUrl = uploadStorage.getFileView(MEDIA_BUCKET_ID, fileId);

    return NextResponse.json({
      success: true,
      fileId: uploadedFile.$id,
      fileName: file.name,
      fileUrl: fileUrl.toString(),
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('bucket')) {
        return NextResponse.json({
          error: 'Storage bucket not found',
          message: 'Please create a storage bucket with ID "68612caf00124c2bcded" in your Appwrite project'
        }, { status: 500 });
      }
      
      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return NextResponse.json({
          error: 'Permission denied',
          message: 'Please check your Appwrite API key permissions. It needs storage.read, storage.write, and storage.delete permissions.'
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      error: 'Upload failed',
      message: 'Failed to upload file to Appwrite storage',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 