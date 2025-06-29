'use client';

import { useState, useEffect } from 'react';
import AuthForm from '@/components/AuthForm';
import ChatList from '@/components/ChatList';
import ChatWindow from '@/components/ChatWindow';
import CallModal from '@/components/CallModal';
import { useSocket } from '@/hooks/useSocket';
import { User, Message, Conversation } from '@/types';
import { MessageCircle, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Call state
  const [showCallModal, setShowCallModal] = useState(false);
  const [callData, setCallData] = useState<{
    caller: User;
    callType: 'audio' | 'video';
    isIncoming: boolean;
    callId?: string;
  } | null>(null);

  // Initialize WebSocket connection
  const { isConnected, sendCallAnswer, sendCallEnd } = useSocket({
    token: token || '',
    onUserOnline: (data) => {
      // Update user online status in conversations
      setConversations(prev => 
        prev.map(conv => ({
          ...conv,
          participants: conv.participants.map(p => 
            p._id === data.userId ? { ...p, isOnline: true } : p
          )
        }))
      );
    },
    onUserOffline: (data) => {
      // Update user offline status in conversations
      setConversations(prev => 
        prev.map(conv => ({
          ...conv,
          participants: conv.participants.map(p => 
            p._id === data.userId ? { ...p, isOnline: false } : p
          )
        }))
      );
    },
    onCallOffer: (data) => {
      console.log('Incoming call received:', data);
      // Handle incoming call
      setCallData({
        caller: data.caller,
        callType: data.callType,
        isIncoming: true,
        callId: data.callId,
      });
      setShowCallModal(true);
    },
    onCallAnswer: (data) => {
      console.log('Call answered:', data);
      // Handle call answer
    },
    onCallEnd: (data) => {
      console.log('Call ended:', data);
      // Handle call end
      setShowCallModal(false);
      setCallData(null);
    },
  });

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (token && user) {
      fetchConversations();
    }
  }, [token, user]);

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const handleLogin = (userToken: string, userData: User) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setConversations([]);
    setSelectedConversation(null);
    setShowCallModal(false);
    setCallData(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleNewMessage = (message: Message) => {
    // Update conversation with new message
    if (message.conversationId) {
      setConversations(prev => 
        prev.map(conv => 
          conv._id === message.conversationId 
            ? { ...conv, lastMessage: message, lastMessageAt: message.createdAt }
            : conv
        )
      );
    }
  };

  const handleConversationSelect = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowMenu(false);
  };

  const handleNewConversation = async (participantId: string) => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ participantId }),
      });

      if (response.ok) {
        const conversation = await response.json();
        setConversations(prev => [conversation, ...prev]);
        setSelectedConversation(conversation);
        setShowMenu(false);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // Call handlers
  const handleCallAccept = () => {
    if (callData && callData.callId) {
      // The actual call acceptance logic is handled in CallModal
      console.log('Call accepted');
    }
  };

  const handleCallReject = () => {
    if (callData && callData.caller) {
      sendCallEnd(callData.caller._id);
    }
    setShowCallModal(false);
    setCallData(null);
  };

  const handleCallEnd = () => {
    if (callData && callData.caller) {
      sendCallEnd(callData.caller._id);
    }
    setShowCallModal(false);
    setCallData(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user || !token) {
    return <AuthForm onSuccess={handleLogin} />;
  }

  return (
    <div className="h-screen flex bg-gray-100 overflow-hidden">
      {/* Sidebar - WhatsApp Desktop Style */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:relative lg:flex
        fixed inset-y-0 left-0 z-30
        w-80 lg:w-96 xl:w-[420px] 
        bg-white border-r border-gray-200
        transition-transform duration-300 ease-in-out
      `}>
        <ChatList
          token={token}
          currentUser={user}
          onSelectConversation={handleConversationSelect}
          selectedConversationId={selectedConversation?._id}
          onLogout={handleLogout}
        />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            currentUser={user}
            token={token}
            onNewMessage={handleNewMessage}
            onBack={() => setSelectedConversation(null)}
            onMenuClick={() => setSidebarOpen(true)}
            onLogout={handleLogout}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md px-6">
              <div className="p-6 bg-green-100 rounded-full inline-block mb-6">
                <MessageCircle className="w-16 h-16 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to WhatsApp Clone
              </h2>
              <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                Select a conversation from the sidebar to start messaging, or search for users to begin a new conversation.
              </p>
              <div className="space-y-4">
                <Button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Open Conversations
                </Button>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call Modal */}
      {showCallModal && callData && (
        <CallModal
          isOpen={showCallModal}
          onClose={() => {
            setShowCallModal(false);
            setCallData(null);
          }}
          caller={callData.caller}
          currentUser={user}
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