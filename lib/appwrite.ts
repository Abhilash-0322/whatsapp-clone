import { Client, Storage, Databases, Account } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '686128d40026a67171fb');

export const storage = new Storage(client);
export const databases = new Databases(client);
export const account = new Account(client);

// Bucket ID for media files
export const MEDIA_BUCKET_ID = process.env.APPWRITE_BUCKET_ID || '68612caf00124c2bcded';

// Database and collection IDs
export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'whatsapp-clone';
export const MESSAGES_COLLECTION_ID = process.env.APPWRITE_MESSAGES_COLLECTION_ID || 'messages';

export default client; 