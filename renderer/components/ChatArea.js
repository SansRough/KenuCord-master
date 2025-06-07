import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Input,
  Button,
  Flex,
  Text,
  VStack,
  HStack,
  Heading,
  Avatar,
  IconButton,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useChatContext } from '../context/ChatContext';
import NotificationPanel from './NotificationPanel';

// Animasyon tanımları
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const slideIn = keyframes`
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

// Yazıyor göstergesi için dots animasyonu
const typingDots = keyframes`
  0%, 20% { content: "."; }
  40% { content: ".."; }
  60% { content: "..."; }
  80%, 100% { content: ""; }
`;

export default function ChatArea({ toggleTheme, isDark }) {
  const [message, setMessage] = useState('');
  const { 
    messages, 
    currentRoom, 
    sendMessage, 
    typingUsers, 
    handleTyping 
  } = useChatContext();
  const messagesEndRef = useRef(null);
  const [profileTimestamps, setProfileTimestamps] = useState({});
  
  // Profil fotoğrafı güncellemelerini dinle
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      const { username, timestamp } = event.detail;
      console.log(`ChatArea: Profil güncelleme alındı: ${username}, timestamp: ${timestamp}`);
      
      // Profil zaman damgalarını güncelle
      setProfileTimestamps(prev => ({
        ...prev,
        [username]: timestamp
      }));
    };
    
    // Yerel olayı dinle
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };
  
  // Mesaj yazarken typing durumunu bildirme
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      handleTyping();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Store processed messages with stable timestamps in a ref
  const processedMessagesRef = useRef({});
  
  // Group messages by user and time
  const groupMessages = () => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((msg, index) => {
      // Create a unique key for this message
      const msgKey = `${msg.id || index}-${msg.msg}`;
      
      // Use stored timestamp if available, or create a new one only on first appearance
      if (!processedMessagesRef.current[msgKey]) {
        processedMessagesRef.current[msgKey] = {
          timestamp: msg.timestamp || new Date().toLocaleTimeString()
        };
      }
      
      const messageTimestamp = processedMessagesRef.current[msgKey].timestamp;
      
      // Check if it's a system message
      const isSystemMessage = !msg.msg.includes(':');
      
      if (isSystemMessage) {
        // Add system message as its own group
        groups.push({
          isSystem: true,
          messages: [msg],
          timestamp: messageTimestamp,
        });
        currentGroup = null;
      } else {
        // Extract username from message (assuming format "username: message")
        const [username, ...messageParts] = msg.msg.split(':');
        const messageContent = messageParts.join(':').trim();
        const user = username.trim();
        
        // Check if we should start a new group
        const shouldStartNewGroup = !currentGroup || 
                                   currentGroup.user !== user || 
                                   (messageTimestamp && currentGroup.timestamp && 
                                    new Date(messageTimestamp) - new Date(currentGroup.timestamp) > 5 * 60 * 1000); // 5 minutes difference
        
        if (shouldStartNewGroup) {
          currentGroup = {
            user,
            messages: [{ content: messageContent, timestamp: messageTimestamp }],
            timestamp: messageTimestamp,
            isSystem: false,
          };
          groups.push(currentGroup);
        } else {
          // Add to existing group
          currentGroup.messages.push({
            content: messageContent,
            timestamp: messageTimestamp
          });
        }
      }
    });
    
    return groups;
  };

  const messageGroups = groupMessages();

  // Function to format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    // If it's already a string that looks formatted, just return it
    if (typeof timestamp === 'string' && timestamp.includes(':')) {
      return timestamp;
    }
    
    // Otherwise, format the timestamp
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch (e) {
      return '';
    }
  };
  
  // Function to check if this is the first render
  // We'll use this to ensure timestamps don't change after first render
  const isFirstRender = useRef(true);
  useEffect(() => {
    isFirstRender.current = false;
  }, []);
  
  // Yazıyor olan kullanıcıları göster
  const getTypingUsersText = () => {
    const typingUsernames = Object.keys(typingUsers);
    
    if (typingUsernames.length === 0) {
      return null;
    } else if (typingUsernames.length === 1) {
      return `${typingUsernames[0]} yazıyor...`;
    } else if (typingUsernames.length === 2) {
      return `${typingUsernames[0]} ve ${typingUsernames[1]} yazıyor...`;
    } else {
      return `${typingUsernames.length} kişi yazıyor...`;
    }
  };

  return (
    <Flex direction="column" h="100%" overflow="hidden">
      <Box p={4} bg="bg-chat" borderBottom="1px" borderColor="border-color" display="flex" justifyContent="space-between" alignItems="center">
        <Heading size="md" color="text-primary">
          <Text
            as="span"
            sx={{
              animation: `${slideIn} 0.5s ease-out`,
              display: 'inline-block',
            }}
          >
            {currentRoom}
          </Text>
        </Heading>
        <HStack spacing={2}>
          <NotificationPanel />
          <Tooltip label={isDark ? 'Aydınlık Tema' : 'Koyu Tema'}>
            <IconButton
              icon={isDark ? <SunIcon /> : <MoonIcon />}
              onClick={toggleTheme}
              variant="ghost"
              color="text-primary"
              sx={{
                '&:hover': {
                  animation: `${pulse} 0.5s ease-in-out infinite`,
                },
              }}
            />
          </Tooltip>
        </HStack>
      </Box>
      
      <VStack
        flex="1"
        spacing={4}
        p={4}
        overflowY="auto"
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            width: '10px',
            background: '#f1f1f1',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#888',
            borderRadius: '24px',
          },
        }}
      >
        {messageGroups.map((group, groupIndex) => {
          if (group.isSystem) {
            // Render system message
            return (
              <Box
                key={`group-${groupIndex}`}
                alignSelf="center"
                bg="bg-system-message"
                p={3}
                borderRadius="md"
                boxShadow="sm"
                maxW="80%"
                sx={{
                  animation: `${fadeIn} 0.3s ease-out`,
                }}
              >
                <Text fontSize="sm">{group.messages[0].msg}</Text>
                {group.timestamp && (
                  <Text fontSize="xs" color="gray.500" textAlign="right">
                    {formatTimestamp(group.timestamp)}
                  </Text>
                )}
              </Box>
            );
          }
          
          // Render user message group
          return (
            <Flex 
              key={`group-${groupIndex}`}
              alignSelf="flex-start"
              width="100%"
              direction="column"
              mb={4}
            >
              <HStack alignItems="flex-start" spacing={2}>
                <Avatar
                  size="sm"
                  name={group.user}
                  src={`http://localhost/profile/${group.user}.png${profileTimestamps[group.user] ? `?t=${profileTimestamps[group.user]}` : ''}`}
                />
                
                <VStack align="flex-start" spacing={1} flex={1}>
                  <HStack>
                    <Text fontWeight="bold" fontSize="sm">{group.user}</Text>
                    <Text fontSize="xs" color="gray.500">
                      {formatTimestamp(group.timestamp)}
                    </Text>
                  </HStack>
                  
                  {group.messages.map((msg, msgIndex) => (
                    <Box
                      key={`msg-${groupIndex}-${msgIndex}`}
                      bg="bg-message"
                      p={3}
                      borderRadius="md"
                      boxShadow="sm"
                      maxW="fit-content"
                      sx={{
                        animation: `${fadeIn} 0.3s ease-out`,
                        transition: 'transform 0.2s ease-in-out',
                        _hover: {
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      <Text fontSize="sm">{msg.content}</Text>
                    </Box>
                  ))}
                </VStack>
              </HStack>
            </Flex>
          );
        })}
        <div ref={messagesEndRef} />
      </VStack>
      
      <Box p={4} bg="bg-chat" borderTop="1px" borderColor="border-color">
        <form onSubmit={handleSendMessage}>
          <Flex direction="column">
            <Flex>
              <Input
                value={message}
                onChange={handleMessageChange}
                placeholder="Mesajınızı yazın..."
                mr={2}
              />
              <Button colorScheme="blue" type="submit">
                Gönder
              </Button>
            </Flex>
            
            {getTypingUsersText() && (
              <Text 
                fontSize="xs" 
                color="gray.500" 
                mt={1} 
                fontStyle="italic"
                sx={{
                  '&::after': {
                    content: '""',
                    animation: `${typingDots} 1.5s infinite`,
                  }
                }}
              >
                {getTypingUsersText()}
              </Text>
            )}
          </Flex>
        </form>
      </Box>
    </Flex>
  );
}