import { useState, useEffect } from 'react';
import { useTheme } from '../pages/_app';
import {
  Box,
  VStack,
  Heading,
  Button,
  List,
  ListItem,
  Text,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  useToast,
  InputGroup,
  InputRightElement,
  IconButton,
  Flex,
  Tooltip,
  HStack,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { AddIcon, RepeatIcon } from '@chakra-ui/icons';
import { useChatContext } from '../context/ChatContext';

// Animasyon tanımları
const slideIn = keyframes`
  from { transform: translateX(-10px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
`;

export default function RoomList() {
  const { 
    rooms, 
    currentRoom, 
    switchRoom, 
    createRoom, 
    getRooms,
    unreadMessages,
    totalUnreadCount,
    hasMentions
  } = useChatContext();
  const { isDark } = useTheme();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  
  // Yeni oda oluşturma state'leri
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState('public');
  const [newRoomPassword, setNewRoomPassword] = useState('');
  
  // Özel odaya bağlanma için state'ler
  const [privateRoomName, setPrivateRoomName] = useState('');
  const [privateRoomPassword, setPrivateRoomPassword] = useState('');
  const [isPrivateRoomModalOpen, setIsPrivateRoomModalOpen] = useState(false);
  
  // Oda listesini sadece bir kez yükle
  useEffect(() => {
    // Sadece ilk yükleme sırasında oda listesini al
    // getRooms fonksiyonu artık akıllı sınırlama ile optimize edildi
    // ve sunucudan gelen otomatik güncellemeler zaten oda listesini güncelliyor
    getRooms();
  }, []);
  
  const handleRoomSwitch = (room) => {
    if (room === currentRoom) return;
    
    // Normal oda değiştirme işlemi
    switchRoom(room);
  };
  
  const handleCreateRoom = () => {
    if (!newRoomName.trim()) {
      toast({
        title: 'Hata',
        description: 'Oda adı boş olamaz',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (newRoomType === 'private' && !newRoomPassword.trim()) {
      toast({
        title: 'Hata',
        description: 'Özel oda için şifre gereklidir',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    createRoom(newRoomName, newRoomType, newRoomPassword);
    onClose();
    
    // Form alanlarını temizle
    setNewRoomName('');
    setNewRoomType('public');
    setNewRoomPassword('');
  };
  
  const openPrivateRoomModal = () => {
    setIsPrivateRoomModalOpen(true);
  };
  
  const closePrivateRoomModal = () => {
    setIsPrivateRoomModalOpen(false);
  };
  
  const handleConnectToPrivateRoom = () => {
    if (!privateRoomName.trim()) {
      toast({
        title: 'Hata',
        description: 'Oda adı boş olamaz',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    if (!privateRoomPassword.trim()) {
      toast({
        title: 'Hata',
        description: 'Şifre boş olamaz',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    // Özel odaya bağlanma işlemi
    switchRoom(privateRoomName, privateRoomPassword);
    closePrivateRoomModal();
    
    // Form alanlarını temizle
    setPrivateRoomName('');
    setPrivateRoomPassword('');
  };
  
  return (
    <Box h="100%" p={4} position="relative">
      <VStack align="stretch" spacing={4}>
        <HStack justifyContent="space-between" alignItems="center">
          <Flex alignItems="center">
            <Heading size="md" color="text-primary">Odalar</Heading>
            {/* Toplam okunmamış mesaj sayısı */}
            {totalUnreadCount > 0 && (
              <Box
                bg="red.500"
                color="white"
                borderRadius="full"
                size="xs"
                px={2}
                py={0.5}
                fontSize="xs"
                fontWeight="bold"
                ml={2}
              >
                {totalUnreadCount}
              </Box>
            )}
            {/* Bahsedilme göstergesi */}
            {hasMentions && (
              <Tooltip label="Birisi senden bahsetti" placement="top">
                <Box
                  bg="purple.500"
                  w={3}
                  h={3}
                  borderRadius="full"
                  ml={2}
                  animation={`${bounce} 0.8s ease-in-out infinite`}
                />
              </Tooltip>
            )}
          </Flex>
          <Tooltip label="Oda listesini yenile" placement="top">
            <IconButton
              size="sm"
              icon={<RepeatIcon />}
              aria-label="Yenile"
              onClick={() => getRooms(true)}
              colorScheme="blue"
              variant="ghost"
            />
          </Tooltip>
        </HStack>
        <Button 
          colorScheme="blue" 
          size="sm" 
          onClick={openPrivateRoomModal}
          sx={{
            transition: 'all 0.2s',
            _hover: {
              transform: 'translateY(-2px)',
              boxShadow: 'md',
            }
          }}
        >
          Bağlan
        </Button>
        
        <Box overflowY="auto" flex="1">
          <List spacing={2}>
            {rooms.map((room) => (
              <ListItem 
                key={room}
                p={2}
                bg={currentRoom === room ? (isDark ? 'blue.600' : 'blue.50') : 'transparent'}
                borderRadius="md"
                cursor="pointer"
                _hover={{ bg: isDark ? 'gray.600' : 'gray.100' }}
                onClick={() => handleRoomSwitch(room)}
                sx={{
                  animation: `${slideIn} 0.3s ease-out`,
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <Flex justifyContent="space-between" alignItems="center">
                  <Text fontWeight={currentRoom === room ? 'bold' : 'normal'}>
                    {room}
                  </Text>
                  
                  {/* Okunmamış mesaj sayısı */}
                  {unreadMessages[room] && unreadMessages[room] > 0 && (
                    <Box
                      bg="red.500"
                      color="white"
                      borderRadius="full"
                      px={2}
                      py={1}
                      fontSize="xs"
                      fontWeight="bold"
                      ml={2}
                      animation={`${bounce} 0.8s ease-in-out infinite`}
                    >
                      {unreadMessages[room]}
                    </Box>
                  )}
                </Flex>
              </ListItem>
            ))}
          </List>
        </Box>
      </VStack>
      
      {/* Yeni Oda Oluştur butonu - Sol alta sabitlenmiş */}
      <Box position="absolute" bottom="4" right="4">
        <IconButton
          icon={<AddIcon />}
          onClick={onOpen} 
          size="md" 
          borderRadius="full" 
          width="40px" 
          height="40px" 
          colorScheme="blue"
          _hover={{ 
            transform: 'scale(1.1)',
          }}
          sx={{
            transition: 'all 0.3s',
            '&:hover': {
              animation: `${bounce} 0.5s ease-in-out infinite`,
            }
          }}
          boxShadow="md"
        />
      </Box>
      
      {/* Oda Oluşturma Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Yeni Oda Oluştur</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Oda Adı</FormLabel>
                <Input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Oda adını girin"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Oda Tipi</FormLabel>
                <Select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                >
                  <option value="public">Herkese Açık</option>
                  <option value="private">Şifreli (Özel)</option>
                </Select>
              </FormControl>
              
              {newRoomType === 'private' && (
                <FormControl>
                  <FormLabel>Oda Şifresi</FormLabel>
                  <Input
                    type="password"
                    value={newRoomPassword}
                    onChange={(e) => setNewRoomPassword(e.target.value)}
                    placeholder="Şifre belirleyin"
                  />
                </FormControl>
              )}
              
              <Button
                colorScheme="blue"
                mr={3}
                onClick={handleCreateRoom}
                width="full"
              >
                Oluştur
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Özel Odaya Bağlanma Modal */}
      <Modal isOpen={isPrivateRoomModalOpen} onClose={closePrivateRoomModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Özel Bir Odaya Bağlan</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Oda Adı</FormLabel>
                <Input
                  value={privateRoomName}
                  onChange={(e) => setPrivateRoomName(e.target.value)}
                  placeholder="Oda adını girin"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Oda Şifresi</FormLabel>
                <Input
                  type="password"
                  value={privateRoomPassword}
                  onChange={(e) => setPrivateRoomPassword(e.target.value)}
                  placeholder="Oda şifresini girin"
                />
              </FormControl>
              
              <Button
                colorScheme="blue"
                mr={3}
                onClick={handleConnectToPrivateRoom}
                width="full"
              >
                Bağlan
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}