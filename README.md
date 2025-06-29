# WhatsApp Clone

A real-time messaging application built with Next.js, MongoDB, and Appwrite for media storage.

## Features

- 🔐 User authentication and registration
- 💬 Real-time messaging
- 📱 Responsive design (mobile-first)
- 📎 Media sharing (images, documents)
- 👥 User search and conversation management
- 🎨 WhatsApp Desktop-like interface
- 📊 Online/offline status

## Tech Stack

- **Frontend**: Next.js 13, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Storage**: Appwrite (for media files)
- **Authentication**: JWT tokens
- **UI Components**: Radix UI, Lucide React icons

## Prerequisites

- Node.js 18+ 
- MongoDB database
- Appwrite account and project

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd whatsapp-clone
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Appwrite Configuration
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id
APPWRITE_API_KEY=your_appwrite_api_key
```

### 3. Appwrite Setup

1. **Create an Appwrite Project**:
   - Go to [Appwrite Console](https://console.appwrite.io/)
   - Create a new project
   - Copy your Project ID

2. **Create a Storage Bucket**:
   - In your Appwrite project, go to Storage
   - Create a new bucket named `whatsapp-media`
   - Set permissions to allow authenticated users to read/write
   - Copy the Bucket ID

3. **Generate API Key**:
   - Go to API Keys in your Appwrite project
   - Create a new API key with the following permissions:
     - `storage.read`
     - `storage.write`
     - `storage.delete`

4. **Update Appwrite Configuration**:
   - Open `lib/appwrite.ts`
   - Replace `your-project-id` with your actual Project ID
   - Replace `whatsapp-media` with your actual Bucket ID if different

### 4. MongoDB Setup

1. **Create a MongoDB Database**:
   - Use MongoDB Atlas or local MongoDB
   - Create a database for the application
   - Update the `MONGODB_URI` in your `.env.local`

2. **Database Collections**:
   The application will automatically create the following collections:
   - `users` - User accounts
   - `conversations` - Chat conversations
   - `messages` - Individual messages

### 5. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Usage

### Authentication
1. Register a new account or login with existing credentials
2. JWT tokens are automatically stored in localStorage

### Messaging
1. Search for users to start conversations
2. Send text messages and media files
3. View real-time message updates

### Media Sharing
- Click the paperclip icon to attach files
- Supported formats: Images, PDFs, Documents, Text files
- Files are uploaded to Appwrite storage
- Images are displayed inline, other files show as attachments

## Project Structure

```
whatsapp-clone/
├── app/                    # Next.js 13 app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── conversations/ # Conversation management
│   │   ├── messages/      # Message handling
│   │   ├── upload/        # File upload to Appwrite
│   │   └── users/         # User management
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── AuthForm.tsx      # Authentication form
│   ├── ChatList.tsx      # Conversation list
│   └── ChatWindow.tsx    # Chat interface
├── lib/                  # Utility libraries
│   ├── appwrite.ts       # Appwrite configuration
│   ├── auth.ts           # Authentication utilities
│   ├── mongodb.ts        # Database connection
│   └── utils.ts          # General utilities
├── models/               # MongoDB models
│   ├── Conversation.ts   # Conversation schema
│   ├── Message.ts        # Message schema
│   └── User.ts           # User schema
└── hooks/                # Custom React hooks
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Conversations
- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create new conversation

### Messages
- `GET /api/messages?conversationId=id` - Get conversation messages
- `POST /api/messages` - Send new message

### Users
- `GET /api/users?search=query` - Search users

### Upload
- `POST /api/upload` - Upload media files to Appwrite

## Responsive Design

The application is designed to work seamlessly across all devices:

- **Mobile (< 1024px)**: Sidebar slides in/out, full-screen chat
- **Desktop (≥ 1024px)**: Side-by-side layout like WhatsApp Desktop
- **Tablet**: Adaptive layout with optimized spacing

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- Secure file upload with type checking
- CORS protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the existing issues
2. Create a new issue with detailed information
3. Include error logs and steps to reproduce

## Future Enhancements

- [ ] Real-time notifications
- [ ] Voice messages
- [ ] Video calls
- [ ] Group chats
- [ ] Message reactions
- [ ] Message search
- [ ] Dark mode
- [ ] Message encryption
- [ ] File sharing improvements
- [ ] User profiles and avatars 