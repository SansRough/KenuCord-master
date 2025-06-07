import { useState, useEffect } from 'react';
import { Box, Flex, IconButton, useColorMode } from '@chakra-ui/react';
import { useTheme } from './_app';
import LoginForm from '../components/loginForm';
import ChatArea from '../components/ChatArea';
import RoomList from '../components/RoomList';
import UserList from '../components/UserList';
import { useChatContext } from '../context/ChatContext';


export default function Home() {
  const { isConnected } = useChatContext();

  if (!isConnected) {
    return <LoginForm />;
  }

  const { isDark, toggleTheme } = useTheme();

  return (
    <Flex h="100vh" overflow="hidden" bg="bg-app">
      <Box w="250px" bg="bg-sidebar" borderRight="1px" borderColor="border-color" overflow="auto">
        <RoomList />
      </Box>
      <Box flex="1" display="flex" flexDirection="column" bg="bg-app">
        <ChatArea toggleTheme={toggleTheme} isDark={isDark} />
      </Box>
      <Box w="250px" bg="bg-sidebar" borderLeft="1px" borderColor="border-color" overflow="auto">
        <UserList />
      </Box>
    </Flex>
  );
}