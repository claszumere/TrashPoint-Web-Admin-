// src/pages/LiveChat.jsx

import React, { useState, useEffect, useRef } from 'react';
import {
  getLiveConversations,
  getLiveMessages,
  sendAdminLiveMessage,
  subscribeToLiveChat,
  getUserProfile,
  supabase,
} from '../services/supabase';
import { useNotification } from '../context/NotificationContext';

const LiveChat = () => {
  const { showError } = useNotification();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Fetch conversation list with user names
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const convs = await getLiveConversations();
        
        const enriched = await Promise.all(
          convs.map(async (conv) => {
            const parts = conv.conversation_id.split('_');
            const role = parts[0];
            const userId = parts[1];
            
            let userName = 'Unknown User';
            if (role && userId) {
              const profile = await getUserProfile(role, userId);
              userName = profile.name || 'Unknown User';
            }
            
            return { ...conv, userName, userRole: role, userId };
          })
        );
        
        setConversations(enriched);
      } catch (err) {
        console.error('Failed to load conversations:', err);
        showError('Failed to load conversations');
      }
    };
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [showError]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  // Load messages and set active user when conversation changes
  useEffect(() => {
    if (!activeConv) {
      setActiveUser(null);
      return;
    }

    const conv = conversations.find(c => c.conversation_id === activeConv);
    setActiveUser(conv ? { name: conv.userName, role: conv.userRole, userId: conv.userId } : null);

    const loadMessages = async () => {
      setLoading(true);
      try {
        const msgs = await getLiveMessages(activeConv);
        setMessages(msgs);
      } catch (err) {
        showError('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();

    // Subscribe to realtime updates
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }
    subscriptionRef.current = subscribeToLiveChat(activeConv, (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
    });

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [activeConv, conversations, showError]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || !activeConv) return;
    try {
      await sendAdminLiveMessage(activeConv, newMsg.trim());

      // 🆕 Log admin reply
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          user_email: user.email,
          user_name: user.user_metadata?.name || user.email,
          user_role: 'admin',
          action: 'CHATBOT_AGENT_REPLY',
          entity_type: 'chatbot',
          description: `Replied to ${activeUser?.name || 'user'}: "${newMsg.trim().length > 50 ? newMsg.trim().substring(0, 50) + '...' : newMsg.trim()}"`,
          metadata: {
            conversation_id: activeConv,
            message: newMsg.trim(),
            user_role: activeUser?.role,
            user_name: activeUser?.name,
          },
        });
      }

      setNewMsg('');
    } catch (err) {
      showError('Failed to send message');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Conversations sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
            Live Chat
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {conversations.length} active conversation(s)
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.conversation_id}
              onClick={() => setActiveConv(conv.conversation_id)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                activeConv === conv.conversation_id ? 'bg-green-50 border-l-4 border-l-green-500' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    {conv.userName} ({conv.userRole})
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {conv.message?.substring(0, 40)}...
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {activeConv && activeUser ? (
          <>
            {/* Chat header */}
            <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-700 font-bold text-lg">
                  {activeUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">
                  {activeUser.name} ({activeUser.role})
                </h2>
                <p className="text-xs text-green-600">Online</p>
              </div>
            </div>

            <div
              ref={chatRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
            >
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'} animate-message-appear`}
                >
                  <div
                    className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                      msg.sender_type === 'admin'
                        ? 'bg-green-600 text-white rounded-br-none'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                    }`}
                  >
                    {msg.message}
                    <div className={`text-xs mt-1 ${msg.sender_type === 'admin' ? 'text-green-200' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              {loading && <p className="text-center text-gray-500">Loading...</p>}
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-end gap-2">
                <textarea
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Reply to ${activeUser.name}...`}
                  rows={1}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
                <button
                  onClick={handleSend}
                  disabled={!newMsg.trim()}
                  className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChat;