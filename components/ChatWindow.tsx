'use client';

import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Phone, Video, MoreVertical, Paperclip, Image, File, X, Menu, Download, AlertCircle, LogOut } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CallModal from './CallModal';
import { useSocket } from '@/hooks/useSocket';
import { User, Message, Conversation } from '@/types';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  token: string;
  onNewMessage?: (message: Message) => void;
  onBack?: () => void;
  onMenuClick?: () => void;
  onLogout?: () => void;
}

export default function ChatWindow({
  conversation,
  currentUser,
  token,
  onNewMessage,
  onBack,
  onMenuClick,
  onLogout,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callData, setCallData] = useState<{
    caller: User;
    callType: 'audio' | 'video';
    isIncoming: boolean;
    callId: string;
  } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Find the other participant (not the current user)
  const otherParticipant = (conversation.participants || []).filter(
    (p) => p && p._id && String(p._id) !== String(currentUser._id)
  )[0];

  if (!otherParticipant) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Invalid conversation
          </h2>
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            This conversation does not have another participant.
          </p>
        </div>
      </div>
    );
  }

  // WebSocket connection
  const {
    joinConversation,
    leaveConversation,
    sendMessage: socketSendMessage,
    startTyping,
    stopTyping,
  } = useSocket({
    token,
    onMessage: (data) => {
      if (data.conversationId === conversation._id) {
        setMessages(prev => [...prev, data.message]);
        onNewMessage?.(data.message);
      }
    },
    onTypingStart: (data) => {
      if (data.conversationId === conversation._id && data.userId !== currentUser._id) {
        setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
      }
    },
    onTypingStop: (data) => {
      if (data.conversationId === conversation._id) {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }
    },
  });

  // Debug logging to help identify the issue
  useEffect(() => {
    console.log('ChatWindow Debug:', {
      conversationId: conversation._id,
      participants: conversation.participants,
      currentUserId: currentUser._id,
      otherParticipant: otherParticipant,
      participantIds: conversation.participants.map(p => p._id)
    });
  }, [conversation, currentUser._id, otherParticipant]);

  // Join conversation room when component mounts
  useEffect(() => {
    joinConversation(conversation._id);
    return () => {
      leaveConversation(conversation._id);
    };
  }, [conversation._id, joinConversation, leaveConversation]);

  useEffect(() => {
    fetchMessages();
  }, [conversation._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `/api/messages?conversationId=${conversation._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFileToAppwrite = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return result.fileUrl;
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
    if (!isTyping) {
      setIsTyping(true);
      startTyping(conversation._id);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping(conversation._id);
    }, 1000);
  };

  const initiateCall = async (callType: 'audio' | 'video') => {
    if (!otherParticipant) return;

    try {
      // Generate a unique call ID
      const callId = `${currentUser._id}-${otherParticipant._id}-${Date.now()}`;
      
      // Set up the call modal for outgoing call
      setCallData({
        caller: currentUser,
        callType,
        isIncoming: false,
        callId,
      });
      setShowCallModal(true);
      
      // The actual WebRTC offer will be created in the CallModal component
      console.log('Initiating call:', { callType, receiverId: otherParticipant._id, callId });
    } catch (error) {
      console.error('Error initiating call:', error);
    }
  };

  const handleCallAccept = async () => {
    // Handle call acceptance logic
    console.log('Call accepted');
  };

  const handleCallReject = async () => {
    // Handle call rejection logic
    console.log('Call rejected');
    setShowCallModal(false);
    setCallData(null);
  };

  const handleCallEnd = async () => {
    // Handle call end logic
    console.log('Call ended');
    setShowCallModal(false);
    setCallData(null);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      stopTyping(conversation._id);
    }

    try {
      let mediaUrl: string | undefined;
      let messageType: 'text' | 'image' | 'file' = 'text';
      let fileName: string | undefined;

      if (selectedFile) {
        setUploading(true);
        mediaUrl = await uploadFileToAppwrite(selectedFile);
        fileName = selectedFile.name;
        
        if (selectedFile.type.startsWith('image/')) {
          messageType = 'image';
        } else {
          messageType = 'file';
        }
        
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploading(false);
      }

      const messageData = {
        conversationId: conversation._id,
        content: messageContent || (selectedFile ? `Sent ${fileName}` : ''),
        messageType,
        mediaUrl,
        fileName,
      };

      // Send via WebSocket for real-time delivery
      socketSendMessage(conversation._id, messageData);

      // Also save to database
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const message = await response.json();
        // Don't add to messages here as it will come via WebSocket
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isOwn = message.sender._id === currentUser._id;
    
    return (
      <div
        key={message._id}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end max-w-xs lg:max-w-md`}>
          <Avatar className="h-6 w-6 mx-2">
            <AvatarImage src={message.sender.avatar} />
            <AvatarFallback className="text-xs">
              {message.sender.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div
            className={`px-4 py-2 rounded-lg ${
              isOwn
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-900'
            }`}
          >
            {message.messageType === 'image' && message.mediaUrl && (
              <div className="mb-2">
                <img 
                  src={message.mediaUrl} 
                  alt="Shared image" 
                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: '300px', minHeight: '100px' }}
                  onClick={() => window.open(message.mediaUrl, '_blank')}
                />
              </div>
            )}
            
            {message.messageType === 'file' && message.mediaUrl && (
              <div className="mb-2 p-3 bg-white bg-opacity-20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <File className="w-8 h-8 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {message.fileName || 'File'}
                    </p>
                    <p className="text-xs opacity-75">
                      Click to download
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(message.mediaUrl, '_blank')}
                    className="p-1 hover:bg-white hover:bg-opacity-20"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {message.content && (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            )}
            
            <p
              className={`text-xs mt-1 ${
                isOwn ? 'text-green-100' : 'text-gray-500'
              }`}
            >
              {(() => {
                try {
                  const date = new Date(message.createdAt);
                  if (isNaN(date.getTime())) {
                    return 'Invalid date';
                  }
                  return formatDistanceToNow(date, {
                    addSuffix: true,
                  });
                } catch (error) {
                  return 'Invalid date';
                }
              })()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="lg:hidden mr-2"
            >
              ←
            </Button>
          )}
          {onMenuClick && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMenuClick}
              className="lg:hidden mr-2"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10 mr-3">
            <AvatarImage src={otherParticipant.avatar} />
            <AvatarFallback>
              {otherParticipant.name?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{otherParticipant.name}</div>
            <div className="text-sm text-gray-500">
              {otherParticipant.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => initiateCall('audio')}
            className="hover:bg-green-100"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => initiateCall('video')}
            className="hover:bg-green-100"
          >
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-5 h-5" />
          </Button>
          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-gray-600 hover:text-gray-800"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : (
          <>
            {messages.map((message) => renderMessage(message))}
            
            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center space-x-2 text-gray-500 text-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>
                  {typingUsers.length === 1 
                    ? `${otherParticipant.name} is typing...`
                    : `${typingUsers.length} people are typing...`
                  }
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center space-x-3">
              {selectedFile.type.startsWith('image/') && previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <File className="w-12 h-12 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-sm">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeSelectedFile}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t bg-gray-50">
        <form onSubmit={sendMessage} className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-500 hover:text-gray-700"
            disabled={sending || uploading}
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sending || uploading}
          />
          <Button
            type="submit"
            disabled={(!newMessage.trim() && !selectedFile) || sending || uploading}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            {sending || uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Call Modal */}
      {callData && (
        <CallModal
          isOpen={showCallModal}
          onClose={() => {
            setShowCallModal(false);
            setCallData(null);
          }}
          caller={callData.caller}
          currentUser={currentUser}
          callType={callData.callType}
          isIncoming={callData.isIncoming}
          callId={callData.callId}
          token={token}
          onAccept={handleCallAccept}
          onReject={handleCallReject}
          onEndCall={handleCallEnd}
        />
      )}
    </div>
  );
}