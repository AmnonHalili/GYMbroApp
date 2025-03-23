import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Box, TextField, IconButton, Typography, Avatar, Paper, CircularProgress, Divider } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { Message, chatService } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { formatRelativeTime } from '../../utils/dateUtils';
import api from '../../services/api';

interface LocationState {
  participant: {
    _id: string;
    username: string;
    profilePicture?: string;
  };
}

const ChatConversation: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const location = useLocation();
  const { participant } = (location.state as LocationState) || { participant: { _id: '', username: '' } };
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { authState } = useAuth();
  const currentUser = authState.user;
  const { socket, onlineUsers } = useSocket();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingMore = useRef(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Fetch messages when chatId changes
  useEffect(() => {
    if (!chatId) return;
    
    const fetchMessages = async () => {
      try {
        setLoading(true);
        console.log(`[Chat] Fetching messages for chat ID: ${chatId}`);
        const response = await chatService.getChatMessages(chatId);
        console.log(`[Chat] Received ${response.messages.length} messages from server`);
        
        // Sort messages by createdAt in ascending order (oldest first)
        const sortedMessages = response.messages
          .reverse() // API returns them in descending order, so we reverse to get ascending
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        setMessages(sortedMessages);
        setHasMore(response.pagination.page < response.pagination.totalPages);
        setPage(1);
        
        // Mark messages as read
        await chatService.markMessagesAsRead(chatId);
        if (socket) {
          console.log(`[Chat] Joining chat room: chat:${chatId}`);
          socket.emit('chat:join', chatId);
          console.log(`[Chat] Marking messages as read for chat: ${chatId}`);
          socket.emit('mark messages read', { chatId });
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    
    // Cleanup function to leave the chat room
    return () => {
      if (socket && chatId) {
        console.log(`[Chat] Leaving chat room: chat:${chatId}`);
        socket.emit('chat:leave', chatId);
      }
    };
  }, [chatId, socket]);

  // Handle socket events for messages
  useEffect(() => {
    if (!socket || !chatId) return;

    // Listen for new messages
    socket.on('chat:message', (newMessage: Message) => {
      console.log('[Chat] Received new message:', newMessage);
      
      // Only add message if it belongs to current chat
      if (newMessage.chat === chatId) {
        // Add message in chronological order
        setMessages(prev => [...prev, newMessage].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        ));
        
        // Mark as read if we're in the chat
        socket.emit('message:read', { 
          chatId,
          messageIds: [newMessage._id]
        });
        
        chatService.markMessagesAsRead(chatId).catch(err => 
          console.error('Error marking messages as read:', err)
        );
      }
    });

    // Listen for message sent confirmation
    socket.on('message sent', (confirmedMessage: Message) => {
      console.log('[Chat] Message sent confirmation:', confirmedMessage);
      
      // Replace temporary message with confirmed one
      setMessages(prev => 
        prev.map(msg => 
          msg._id.startsWith('temp-') && msg.content === confirmedMessage.content
            ? confirmedMessage
            : msg
        )
      );
    });

    // Listen for typing indicators
    socket.on('typing:start', ({ userId, chatId: typingChatId }: { userId: string; chatId: string }) => {
      console.log(`[Chat] User ${userId} is typing in chat ${typingChatId}`);
      if (userId === participant._id && typingChatId === chatId) {
        setIsTyping(true);
      }
    });

    socket.on('typing:stop', ({ userId, chatId: typingChatId }: { userId: string; chatId: string }) => {
      console.log(`[Chat] User ${userId} stopped typing in chat ${typingChatId}`);
      if (userId === participant._id && typingChatId === chatId) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off('chat:message');
      socket.off('message sent');
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, [socket, chatId, participant._id, currentUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load more messages when scrolling to top
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || !hasMore || isLoadingMore.current) return;

    if (container.scrollTop < 50) {
      loadMoreMessages();
    }
  };

  const loadMoreMessages = async () => {
    if (!chatId || isLoadingMore.current) return;
    
    try {
      isLoadingMore.current = true;
      const nextPage = page + 1;
      const response = await chatService.getChatMessages(chatId, nextPage);
      
      // Store current scroll height
      const scrollContainer = messagesContainerRef.current;
      const oldScrollHeight = scrollContainer?.scrollHeight || 0;
      
      // Add messages in chronological order
      const oldMessages = response.messages
        .reverse() // API returns them in descending order, so we reverse to get ascending
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      
      setMessages(prev => [...oldMessages, ...prev].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ));
      
      setHasMore(nextPage < response.pagination.totalPages);
      setPage(nextPage);
      
      // Restore scroll position
      if (scrollContainer) {
        setTimeout(() => {
          const newScrollHeight = scrollContainer.scrollHeight;
          scrollContainer.scrollTop = newScrollHeight - oldScrollHeight;
        }, 0);
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      isLoadingMore.current = false;
    }
  };

  const handleTyping = () => {
    if (!socket || !chatId) return;
    
    socket.emit('typing:start', { 
      chatId,
      recipient: participant._id
    });
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set a new timeout
    const timeout = setTimeout(() => {
      socket.emit('typing:stop', { 
        chatId,
        recipient: participant._id
      });
    }, 3000);
    
    setTypingTimeout(timeout);
  };

  // Function to send message through REST API
  const sendMessageViaAPI = async (content: string, recipientId: string, chatId: string) => {
    try {
      console.log('[Chat] Sending message via API fallback');
      const response = await api.post(`/chats/${chatId}/messages`, {
        content,
        recipient: recipientId
      });
      return response.data;
    } catch (error) {
      console.error('[Chat] Failed to send message via API:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    console.log('handleSendMessage called, messageText:', messageText);
    if (!messageText.trim() || !chatId || !currentUser) {
      console.log('Cannot send message - validation failed:', {
        hasText: !!messageText.trim(),
        hasChatId: !!chatId,
        hasCurrentUser: !!currentUser
      });
      return;
    }

    // Prevent double-sending
    if (sendingMessage) {
      console.log('Already sending a message, please wait');
      return;
    }

    setSendingMessage(true);
    
    // Create a temporary message object to show immediately
    const tempMessage: Message = {
      _id: `temp-${Date.now()}`,
      content: messageText,
      sender: {
        _id: currentUser._id?.toString() || '',
        username: currentUser.username || '',
        profilePicture: currentUser.profilePicture || undefined
      },
      recipient: participant._id,
      chat: chatId,
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add the message to the UI immediately in chronological order
    setMessages(prev => [...prev, tempMessage].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ));

    const messageContent = messageText;
    // Clear the input field immediately for better UX
    setMessageText('');
    
    // Stop typing indicator
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    try {
      // Try to send via socket first
      if (socket) {
        console.log('Sending message through socket:', {
          content: messageContent,
          recipient: participant._id,
          chatId
        });
        
        socket.emit('chat:message', {
          chatId,
          recipient: participant._id,
          content: messageContent
        });
        
        socket.emit('typing:stop', { 
          chatId,
          recipient: participant._id
        });
      } else {
        // If socket is not available, use REST API as fallback
        const sentMessage = await sendMessageViaAPI(messageContent, participant._id, chatId);
        console.log('[Chat] Message sent via API:', sentMessage);
        
        // Update the temporary message with the real one
        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempMessage._id ? sentMessage : msg
          )
        );
      }
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      
      // Try API as fallback if socket failed
      if (socket) {
        try {
          const sentMessage = await sendMessageViaAPI(messageContent, participant._id, chatId);
          console.log('[Chat] Message sent via API fallback:', sentMessage);
          
          // Update the temporary message with the real one
          setMessages(prev => 
            prev.map(msg => 
              msg._id === tempMessage._id ? sentMessage : msg
            )
          );
        } catch (secondError) {
          console.error('[Chat] All send methods failed:', secondError);
          // Show the temporary message as failed
          setMessages(prev => 
            prev.map(msg => 
              msg._id === tempMessage._id
                ? { ...msg, content: `${msg.content} (שליחה נכשלה)` }
                : msg
            )
          );
        }
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle Enter key for sending message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('Enter key pressed, calling handleSendMessage');
      handleSendMessage();
    }
    
    // Handle typing indicator
    handleTyping();
  };

  // Check if user is online
  const isOnline = onlineUsers.has(participant._id.toString());
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat Header */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center' }}>
        <Avatar src={participant.profilePicture || undefined} alt={participant.username} />
        <Box sx={{ ml: 2 }}>
          <Typography variant="h6">{participant.username}</Typography>
          <Typography variant="body2">
            {isOnline ? 'מחובר/ת' : 'לא מחובר/ת'}
          </Typography>
        </Box>
      </Box>
      
      <Divider />
      
      {/* Messages Container */}
      <Box 
        ref={messagesContainerRef}
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          bgcolor: '#f5f7fb' // Light background for chat area
        }}
        onScroll={handleScroll}
      >
        {hasMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ cursor: 'pointer' }}
              onClick={loadMoreMessages}
            >
              טען הודעות נוספות
            </Typography>
          </Box>
        )}
        
        {messages.map((message) => {
          const isMyMessage = currentUser && message.sender._id === currentUser?._id?.toString();
          
          return (
            <Box 
              key={message._id} 
              sx={{ 
                alignSelf: isMyMessage ? 'flex-end' : 'flex-start',
                maxWidth: '70%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMyMessage ? 'flex-end' : 'flex-start'
              }}
            >
              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: isMyMessage 
                    ? 'primary.main' // Darker blue for current user
                    : '#e0e0e0', // Light gray for other user
                  color: isMyMessage ? 'white' : 'text.primary',
                  borderRadius: isMyMessage 
                    ? '18px 18px 4px 18px' // Rounded with pointed corner at bottom right
                    : '18px 18px 18px 4px', // Rounded with pointed corner at bottom left
                  boxShadow: 1,
                  position: 'relative'
                }}
              >
                <Typography 
                  variant="body1" 
                  sx={{
                    wordBreak: 'break-word'
                  }}
                >
                  {message.content}
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    textAlign: 'right',
                    mt: 0.5,
                    opacity: 0.8,
                    color: isMyMessage ? 'rgba(255, 255, 255, 0.8)' : 'text.secondary'
                  }}
                >
                  {formatRelativeTime(message.createdAt)}
                  {isMyMessage && (
                    <span style={{ marginRight: '8px' }}>
                      {message.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </Typography>
              </Paper>
              
              {/* Show sender avatar for other user's messages */}
              {!isMyMessage && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    mt: 0.5, 
                    ml: 1, 
                    color: 'text.secondary',
                    fontSize: '0.7rem'
                  }}
                >
                  {message.sender.username}
                </Typography>
              )}
            </Box>
          );
        })}
        
        {isTyping && (
          <Box sx={{ alignSelf: 'flex-start', mt: 1 }}>
            <Paper sx={{ 
              p: 1, 
              borderRadius: '12px', 
              bgcolor: '#e0e0e0',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <Typography variant="body2">מקליד/ה...</Typography>
            </Paper>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>
      
      <Divider />
      
      {/* Message Input */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', bgcolor: '#f7f7f7' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="הקלד/י הודעה..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          multiline
          maxRows={4}
          sx={{ 
            mr: 1,
            '& .MuiOutlinedInput-root': {
              borderRadius: '24px',
              bgcolor: 'white'
            }
          }}
          disabled={sendingMessage}
        />
        <IconButton 
          color="primary" 
          onClick={handleSendMessage} 
          disabled={!messageText.trim() || sendingMessage}
          aria-label="שלח הודעה"
          sx={{ 
            cursor: messageText.trim() && !sendingMessage ? 'pointer' : 'default', 
            transition: 'transform 0.2s',
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': { 
              bgcolor: 'primary.dark',
              transform: messageText.trim() && !sendingMessage ? 'scale(1.1)' : 'none' 
            },
            '&.Mui-disabled': {
              bgcolor: 'grey.300',
              color: 'grey.500'
            }
          }}
        >
          {sendingMessage ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
        </IconButton>
      </Box>
      
      {/* CSS for typing animation */}
      <style>{`
        .typing-indicator {
          display: flex;
          align-items: center;
        }
        
        .typing-indicator span {
          height: 8px;
          width: 8px;
          margin: 0 1px;
          background-color: #9E9E9E;
          border-radius: 50%;
          display: inline-block;
          animation: typing-animation 1.4s infinite ease-in-out both;
        }
        
        .typing-indicator span:nth-child(1) {
          animation-delay: 0s;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typing-animation {
          0% { transform: scale(0); }
          50% { transform: scale(1); }
          100% { transform: scale(0); }
        }
      `}</style>
    </Box>
  );
};

export default ChatConversation; 