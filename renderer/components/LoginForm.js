import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
  Container,
  Flex,
  IconButton,
  Tooltip,
  Image,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';
import { useTheme } from '../pages/_app';
import { useChatContext } from '../context/ChatContext';

// Animasyon tanımları
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

export default function LoginForm() {
  const { isDark, toggleTheme } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('3169');
  const [isLoading, setIsLoading] = useState(false);
  const { connect } = useChatContext();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast({
        title: 'Hata',
        description: 'Kullanıcı adı boş olamaz',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!password.trim()) {
      toast({
        title: 'Hata',
        description: 'Şifre boş olamaz',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Pass all four parameters to connect
      await connect(host, parseInt(port, 10), username, password);
    } catch (error) {
      toast({
        title: 'Bağlantı hatası',
        description: error.message || 'Sunucuya bağlanılamadı',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="md" centerContent py={10}>
      <Box 
        p={8} 
        maxWidth="md" 
        borderWidth={1} 
        borderRadius={8} 
        boxShadow="lg" 
        bg="bg-sidebar"
        position="relative"
        sx={{
          animation: `${fadeIn} 0.5s ease-out`,
          transition: 'all 0.3s ease-in-out',
        }}
      >
        <VStack spacing={5} align="flex-start">
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="lg" textAlign="center">KenuCord v1.0.0</Heading>
            <Tooltip label={isDark ? 'Aydınlık Tema' : 'Koyu Tema'}>
              <IconButton
                icon={isDark ? <SunIcon /> : <MoonIcon />}
                onClick={toggleTheme}
                variant="ghost"
                size="md"
                aria-label="Toggle theme"
                sx={{
                  '&:hover': {
                    animation: `${pulse} 0.5s ease-in-out infinite`,
                  },
                }}
              />
            </Tooltip>
          </Flex>
          <Heading size="md" textAlign="center" mb={2}>Sohbet Uygulamasına Hoş Geldiniz</Heading>
          <Text>Başlamak için lütfen giriş yapın</Text>
          
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack spacing={4} align="flex-start" width="100%">
              <FormControl isRequired>
                <FormLabel>Kullanıcı Adı</FormLabel>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Kullanıcı adınızı girin"
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Şifre</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrenizi girin"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Sunucu Adresi</FormLabel>
                <Input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="Sunucu adresini girin"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Port</FormLabel>
                <Input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="Port numarasını girin"
                />
              </FormControl>
              
              <Button
                colorScheme="blue"
                isLoading={isLoading}
                type="submit"
                width="full"
                mt={4}
              >
                Bağlan
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Container>
  );
}