import React, { useEffect, useState } from 'react';
import { Container, Grid, Paper, Box, Typography } from '@mui/material';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import ChatList from '../components/chat/ChatList';
import ChatConversation from '../components/chat/ChatConversation';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chatService';

// Interface for location state
interface LocationState {
  userId?: string;
}

const ChatPage: React.FC = () => {
  const { authState } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [initializing, setInitializing] = useState(false);
  const state = location.state as LocationState | null;
  
  // Initialize chat with user if coming from profile page
  useEffect(() => {
    const initializeChat = async () => {
      // Check if we have a userId in the state (from profile page)
      if (state?.userId && !initializing) {
        try {
          setInitializing(true);
          console.log('Initializing chat with user:', state.userId);
          
          // Get or create chat with this user
          const chatData = await chatService.getSingleChat(state.userId);
          
          // Navigate to the chat conversation
          navigate(`/chat/${chatData.chatId}`, { 
            state: { participant: chatData.participant },
            replace: true // Replace current history entry to avoid back button issues
          });
        } catch (error) {
          console.error('Error initializing chat:', error);
        } finally {
          setInitializing(false);
        }
      }
    };
    
    initializeChat();
  }, [state?.userId, navigate, initializing]);
  
  // Redirect to login if not authenticated
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Chat List */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 130px)',
              overflow: 'hidden',
              borderRadius: 2,
              boxShadow: 3
            }}
          >
            <ChatList />
          </Paper>
        </Grid>
        
        {/* Chat Conversation */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              height: 'calc(100vh - 130px)',
              overflow: 'hidden',
              borderRadius: 2,
              boxShadow: 3
            }}
          >
            <Routes>
              <Route 
                path="/" 
                element={
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography variant="h6" color="text.secondary">
                      בחר שיחה כדי להציג את ההודעות
                    </Typography>
                  </Box>
                } 
              />
              <Route path="/:chatId" element={<ChatConversation />} />
            </Routes>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ChatPage; 