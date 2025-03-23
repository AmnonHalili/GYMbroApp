import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, List, ListItem, ListItemAvatar, Avatar, ListItemText, Typography, Badge, Divider, CircularProgress } from '@mui/material';
import { formatRelativeTime } from '../../utils/dateUtils';
import { Chat, chatService } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const ChatList: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { authState } = useAuth();
  const currentUser = authState.user;
  const { socket, onlineUsers } = useSocket();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        const chatsData = await chatService.getUserChats();
        setChats(chatsData);
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    // Listen for new messages
    if (socket) {
      socket.on('new message', (newMessage: any) => {
        setChats(prev => {
          // Update the chat list with the new message
          return prev.map(chat => {
            if (chat.participant._id === newMessage.sender._id || 
                (chat.participant._id === newMessage.recipient && newMessage.sender._id === currentUser?._id?.toString())) {
              return {
                ...chat,
                lastMessage: {
                  _id: newMessage._id,
                  content: newMessage.content,
                  sender: newMessage.sender,
                  createdAt: newMessage.createdAt,
                  read: false,
                },
                updatedAt: new Date().toISOString(),
                unreadCount: chat.participant._id === newMessage.sender._id 
                  ? chat.unreadCount + 1 
                  : chat.unreadCount
              };
            }
            return chat;
          });
        });
      });

      // Listen for read messages
      socket.on('messages read', ({ chatId, userId }: { chatId: string, userId: string }) => {
        if (userId === currentUser?._id) {
          setChats(prev => 
            prev.map(chat => {
              if (chat._id === chatId) {
                return {
                  ...chat,
                  lastMessage: chat.lastMessage ? {
                    ...chat.lastMessage,
                    read: true
                  } : undefined,
                  unreadCount: 0
                };
              }
              return chat;
            })
          );
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('new message');
        socket.off('messages read');
      }
    };
  }, [socket, currentUser?._id]);

  const handleChatClick = (chatId: string, participant: Chat['participant']) => {
    navigate(`/chat/${chatId}`, { state: { participant } });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" component="div" sx={{ p: 2 }}>
        שיחות
      </Typography>
      {chats.length === 0 ? (
        <Typography variant="body2" sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          אין לך שיחות פעילות כרגע
        </Typography>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {chats.map((chat) => {
            const participantId = chat.participant._id.toString();
            const isOnline = onlineUsers.has(participantId);
            return (
              <React.Fragment key={chat._id}>
                <ListItem 
                  alignItems="flex-start" 
                  onClick={() => handleChatClick(chat._id, chat.participant)}
                  sx={{ 
                    '&:hover': { 
                      bgcolor: 'rgba(0, 0, 0, 0.04)' 
                    },
                    bgcolor: chat.unreadCount > 0 ? 'rgba(0, 120, 255, 0.05)' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      variant="dot"
                      color={isOnline ? 'success' : 'error'}
                    >
                      <Avatar 
                        alt={chat.participant.username} 
                        src={chat.participant.profilePicture || undefined}
                      />
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography component="span" fontWeight={chat.unreadCount > 0 ? 'bold' : 'normal'}>
                          {chat.participant.username}
                        </Typography>
                        {chat.lastMessage && (
                          <Typography variant="caption" color="text.secondary">
                            {formatRelativeTime(chat.lastMessage.createdAt)}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography
                          sx={{ display: 'inline', wordBreak: 'break-word' }}
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {chat.lastMessage ? (
                            chat.lastMessage.sender._id === currentUser?._id ? (
                              <span style={{ display: 'flex', alignItems: 'center' }}>
                                <span>אתה: </span>
                                <span>{chat.lastMessage.content.substring(0, 25)}{chat.lastMessage.content.length > 25 ? '...' : ''}</span>
                              </span>
                            ) : (
                              chat.lastMessage.content.substring(0, 25) + (chat.lastMessage.content.length > 25 ? '...' : '')
                            )
                          ) : 'אין הודעות'}
                        </Typography>
                        {chat.unreadCount > 0 && (
                          <Badge badgeContent={chat.unreadCount} color="primary" />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            );
          })}
        </List>
      )}
    </Box>
  );
};

export default ChatList; 