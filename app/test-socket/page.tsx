'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';

export default function TestSocket() {
  const [token, setToken] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('Disconnected');

  const { isConnected, sendMessage, joinConversation } = useSocket({
    token,
    onMessage: (data) => {
      setMessages(prev => [...prev, data]);
    },
  });

  useEffect(() => {
    setStatus(isConnected ? 'Connected' : 'Disconnected');
  }, [isConnected]);

  const handleConnect = () => {
    // Initialize socket connection
    fetch('/api/socket');
  };

  const handleSendTestMessage = () => {
    if (isConnected) {
      sendMessage('test-conversation', {
        content: 'Test message from client',
        messageType: 'text',
        timestamp: new Date().toISOString()
      });
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">WebSocket Test</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Token:</label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter JWT token"
        />
      </div>

      <div className="mb-4">
        <p>Status: <span className={`font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>{status}</span></p>
      </div>

      <div className="mb-4 space-x-2">
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Initialize Socket
        </button>
        <button
          onClick={handleSendTestMessage}
          disabled={!isConnected}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          Send Test Message
        </button>
        <button
          onClick={() => joinConversation('test-conversation')}
          disabled={!isConnected}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
        >
          Join Test Conversation
        </button>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Messages:</h2>
        <div className="border rounded p-4 h-64 overflow-y-auto bg-gray-50">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="mb-2 p-2 bg-white rounded border">
                <pre className="text-sm">{JSON.stringify(msg, null, 2)}</pre>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Debug Info:</h2>
        <div className="border rounded p-4 bg-gray-50">
          <p><strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
          <p><strong>Token:</strong> {token ? 'Set' : 'Not set'}</p>
          <p><strong>Message Count:</strong> {messages.length}</p>
        </div>
      </div>
    </div>
  );
} 