'use client';

import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, MessageCircle, AlertCircle, LogOut, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { User, Conversation } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ChatListProps {
  token: string;
  currentUser: User;
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversationId?: string;
  onLogout?: () => void;
}

export default function ChatList({
  token,
  currentUser,
  onSelectConversation,
  selectedConversationId,
  onLogout,
}: ChatListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        searchUsers();
      }, 300); // Debounce search

      return () => clearTimeout(timeoutId);
    } else {
      setUsers([]);
      setShowUserSearch(false);
      setShowAllUsers(false);
    }
  }, [searchQuery]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      setSearching(true);
      setError(null);
      
      const response = await fetch(`/api/users?search=${encodeURIComponent(searchQuery.trim())}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter out current user from search results
        const filteredUsers = data.filter((user: User) => user._id !== currentUser._id);
        setUsers(filteredUsers);
        setShowUserSearch(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to search users');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setError('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setSearching(true);
      setError(null);
      
      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filter out current user from all users list
        const filteredUsers = data.filter((user: User) => user._id !== currentUser._id);
        setUsers(filteredUsers);
        setShowAllUsers(true);
        setShowUserSearch(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setSearching(false);
    }
  };

  const createConversation = async (userId: string) => {
    // Prevent creating conversation with self
    if (userId === currentUser._id) {
      setError('Cannot create conversation with yourself');
      toast({ title: 'Error', description: 'Cannot create conversation with yourself', variant: 'destructive' });
      return;
    }
    
    try {
      setCreatingConversation(userId);
      setError(null);
      
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ participantId: userId }),
      });
      
      if (response.ok) {
        const conversation = await response.json();
        console.log('DEBUG: Created/Fetched conversation:', conversation, 'Current user:', currentUser);
        
        // Check if conversation already exists in the list
        const existingConversationIndex = conversations.findIndex(
          conv => conv._id === conversation._id
        );
        
        if (existingConversationIndex !== -1) {
          // Update existing conversation
          setConversations(prev => 
            prev.map((conv, index) => 
              index === existingConversationIndex ? conversation : conv
            )
          );
        } else {
          // Add new conversation to the beginning
          setConversations(prev => [conversation, ...prev]);
        }
        
        onSelectConversation(conversation);
        setSearchQuery('');
        setShowUserSearch(false);
        setShowAllUsers(false);
        setUsers([]);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      setError('Failed to create conversation');
    } finally {
      setCreatingConversation(null);
    }
  };

  const getOtherParticipant = (conversation: Conversation) => {
    // Defensive: handle both populated and unpopulated participants
    const others = (conversation.participants || []).filter(
      (p: any) =>
        p &&
        ((typeof p === 'object' && p._id && p._id !== currentUser._id) ||
         (typeof p === 'string' && p !== currentUser._id))
    );
    if (others.length === 0) return null;
    // If populated, return the object; if not, return a stub
    if (typeof others[0] === 'object') return others[0];
    return { _id: others[0], name: 'Unknown', avatar: '', isOnline: false };
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-green-500">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-white">Chats</h1>
          <div className="flex items-center space-x-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="bg-green-600 text-white">
                {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            {onLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-white hover:bg-green-600 p-2"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-0 focus:ring-2 focus:ring-green-300"
            disabled={searching}
          />
          {searching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
            </div>
          )}
        </div>

        {/* Show All Users Button */}
        {!searchQuery.trim() && !showAllUsers && (
          <Button
            onClick={fetchAllUsers}
            variant="outline"
            size="sm"
            className="mt-2 w-full bg-white hover:bg-gray-50 text-green-600 border-green-300"
            disabled={searching}
          >
            <Users className="w-4 h-4 mr-2" />
            Show All Users
          </Button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showUserSearch && (
          <div className="border-b">
            <div className="p-3 bg-gray-50 text-sm font-medium text-gray-600">
              Search results
            </div>
            {users.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">No users found</p>
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user._id}
                  onClick={() => createConversation(user._id)}
                  className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer border-b ${
                    creatingConversation === user._id ? 'bg-gray-100' : ''
                  }`}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{user.name || 'Unknown User'}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  <div className="flex items-center">
                    {creatingConversation === user._id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                    ) : (
                      user.isOnline && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showAllUsers && (
          <div className="border-b">
            <div className="p-3 bg-gray-50 text-sm font-medium text-gray-600 flex items-center justify-between">
              <span>All Users</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAllUsers(false);
                  setUsers([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </Button>
            </div>
            {users.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p className="text-sm">No users available</p>
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user._id}
                  onClick={() => createConversation(user._id)}
                  className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer border-b ${
                    creatingConversation === user._id ? 'bg-gray-100' : ''
                  }`}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{user.name || 'Unknown User'}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  <div className="flex items-center">
                    {creatingConversation === user._id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                    ) : (
                      user.isOnline && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {conversations.length === 0 && !showUserSearch && !showAllUsers && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No conversations yet</p>
            <p className="text-sm text-center px-4">
              Search for users above or click "Show All Users" to start a new conversation
            </p>
          </div>
        )}

        {conversations
          .filter(conversation => {
            // Only show if there is at least one other participant and not all are current user
            const others = (conversation.participants || []).filter(
              (p: any) => p && ((typeof p === 'object' && p._id && p._id !== currentUser._id) || (typeof p === 'string' && p !== currentUser._id))
            );
            return others.length > 0;
          })
          .map((conversation) => {
            const otherParticipant = getOtherParticipant(conversation);
            if (!otherParticipant) return null;

            return (
              <div
                key={conversation._id}
                onClick={() => onSelectConversation(conversation)}
                className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer border-b ${
                  selectedConversationId === conversation._id ? 'bg-green-50' : ''
                }`}
              >
                <Avatar className="h-12 w-12 mr-3">
                  <AvatarImage src={otherParticipant.avatar} />
                  <AvatarFallback>
                    {otherParticipant.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium truncate">
                      {otherParticipant.name || 'Unknown User'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {conversation.lastMessage && conversation.lastMessage.createdAt && (
                        (() => {
                          try {
                            const date = new Date(conversation.lastMessage.createdAt);
                            if (isNaN(date.getTime())) {
                              return 'Invalid date';
                            }
                            return formatDistanceToNow(date, {
                              addSuffix: false,
                            });
                          } catch (error) {
                            return 'Invalid date';
                          }
                        })()
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 truncate">
                      {conversation.lastMessage
                        ? conversation.lastMessage.content
                        : 'No messages yet'
                      }
                    </div>
                    {otherParticipant.isOnline && (
                      <div className="w-2 h-2 bg-green-500 rounded-full ml-2"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}