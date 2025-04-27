import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CssBaseline from '@mui/material/CssBaseline';
import Stack from '@mui/material/Stack';
import MuiCard from '@mui/material/Card';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import { styled } from '@mui/material/styles';
import AppTheme from '../shared-theme/AppTheme';
import ColorModeSelect from '../shared-theme/ColorModeSelect';
import { SitemarkIcon } from '../sign-up/components/CustomIcons';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

interface ChatInterfaceProps {
  disableCustomTheme?: boolean;
}

// Styled components matching the sign-up page styling
const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: theme.spacing(3),
  gap: theme.spacing(2),
  margin: 'auto',
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  [theme.breakpoints.up('sm')]: {
    width: '600px',
  },
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

const ChatContainer = styled(Stack)(({ theme }) => ({
  height: '100vh',
  maxHeight: '100vh',
  overflowY: 'auto',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(3),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser',
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  maxWidth: '80%',
  padding: theme.spacing(1, 2),
  borderRadius: '1rem',
  backgroundColor: isUser ? theme.palette.primary.main : theme.palette.grey[200],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  marginBottom: theme.spacing(1),
  ...theme.applyStyles('dark', {
    backgroundColor: isUser ? theme.palette.primary.main : theme.palette.grey[800],
  }),
}));

const MessagesArea = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
}));

const ChatInterface: React.FC<ChatInterfaceProps> = (props) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Welcome! How can I assist you today?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: Date.now() + 1,
        text: `I received your message: "${input}"`,
        sender: 'bot',
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <ColorModeSelect sx={{ position: 'fixed', top: 8, right: 8 }} />
      <ChatContainer direction="column" justifyContent="center">
        <Card variant="outlined">
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SitemarkIcon />
            <Typography variant="h4" sx={{ ml: 1 }}>Chat</Typography>
          </Box>
          
          <MessagesArea>
            <List sx={{ width: '100%' }}>
              {messages.map(msg => (
                <ListItem 
                  key={msg.id} 
                  sx={{ 
                    justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    padding: 0.5,
                  }}
                >
                  <MessageBubble isUser={msg.sender === 'user'}>
                    <ListItemText primary={msg.text} />
                  </MessageBubble>
                </ListItem>
              ))}
              <div ref={messagesEndRef} />
            </List>
          </MessagesArea>
          
          <Box 
            component="form" 
            onSubmit={e => { e.preventDefault(); handleSend(); }} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: 1,
              mt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              pt: 2
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); } }}
              size="small"
            />
            <Button 
              variant="contained" 
              endIcon={<SendIcon />}
              onClick={handleSend}
            >
              Send
            </Button>
          </Box>
        </Card>
      </ChatContainer>
    </AppTheme>
  );
};

export default ChatInterface;