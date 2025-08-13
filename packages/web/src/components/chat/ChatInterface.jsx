import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Paperclip, MoreVertical, Phone, Video, 
  Search, ArrowLeft, AlertTriangle, CheckCheck,
  Clock, Ban, Flag
} from 'lucide-react';
import { io } from 'socket.io-client';
import apiService from '../../services/api.service';
import { toast } from 'react-hot-toast';

const ChatInterface = ({ conversationId, recipientId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [recipient, setRecipient] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    initializeChat();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [conversationId, recipientId]);

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Initialize socket connection
      const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('authToken')
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to chat');
        if (conversationId) {
          newSocket.emit('join-conversation', conversationId);
        }
      });

      newSocket.on('new-message', (message) => {
        setMessages(prev => [...prev, message]);
        scrollToBottom();
      });

      newSocket.on('typing', ({ userId, isTyping }) => {
        if (userId === recipientId) {
          setRecipientTyping(isTyping);
        }
      });

      newSocket.on('message-read', ({ messageId }) => {
        setMessages(prev => 
          prev.map(msg => 
            msg._id === messageId ? { ...msg, read: true } : msg
          )
        );
      });

      newSocket.on('scam-warning', ({ message }) => {
        toast.error(`⚠️ Potential scam detected: ${message}`, {
          duration: 5000
        });
      });

      setSocket(newSocket);

      // Load conversation history
      if (conversationId) {
        const messagesData = await apiService.getMessages(conversationId);
        setMessages(messagesData.messages || []);
      }

      // Load recipient info
      if (recipientId) {
        const recipientData = await apiService.getProfile(recipientId);
        setRecipient(recipientData);
      }

      scrollToBottom();
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      toast.error('Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const messageData = {
        conversationId,
        recipientId,
        content: newMessage,
        timestamp: new Date()
      };

      // Emit via socket for real-time
      socket.emit('send-message', messageData);

      // Also send via API for persistence
      await apiService.sendMessage(conversationId || recipientId, newMessage);

      // Add to local messages
      setMessages(prev => [...prev, {
        _id: Date.now(),
        content: newMessage,
        sender: 'me',
        timestamp: new Date(),
        read: false
      }]);

      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { conversationId, isTyping: true });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', { conversationId, isTyping: false });
    }, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const blockUser = async () => {
    try {
      await apiService.blockUser(recipientId);
      toast.success('User blocked');
    } catch (error) {
      toast.error('Failed to block user');
    }
  };

  const reportConversation = async () => {
    try {
      await apiService.reportConversation(conversationId, {
        reason: 'suspicious_activity'
      });
      toast.success('Conversation reported');
    } catch (error) {
      toast.error('Failed to report conversation');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button className="lg:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="relative">
            {recipient?.avatar ? (
              <img
                src={recipient.avatar}
                alt={recipient.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300" />
            )}
            {recipient?.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">{recipient?.name || 'Unknown User'}</h3>
            {recipientTyping ? (
              <p className="text-sm text-green-600">Typing...</p>
            ) : (
              <p className="text-sm text-gray-500">
                {recipient?.isOnline ? 'Online' : `Last seen ${formatTime(recipient?.lastSeen)}`}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Phone className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Video className="w-5 h-5 text-gray-600" />
          </button>
          <div className="relative group">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block">
              <button
                onClick={blockUser}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Block User
              </button>
              <button
                onClick={reportConversation}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-red-600"
              >
                <Flag className="w-4 h-4" />
                Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'me'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.scamWarning && (
                  <div className="flex items-center gap-1 mb-1 text-yellow-500">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs">Potential scam detected</span>
                  </div>
                )}
                
                <p className="break-words">{message.content}</p>
                
                <div className={`flex items-center gap-1 mt-1 text-xs ${
                  message.sender === 'me' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(message.timestamp)}</span>
                  {message.sender === 'me' && message.read && (
                    <CheckCheck className="w-3 h-3 ml-1" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Paperclip className="w-5 h-5 text-gray-600" />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
