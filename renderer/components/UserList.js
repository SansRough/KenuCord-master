import { Box, VStack, Heading, List, ListItem, Text, Avatar, Flex, Badge, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Button, Input, useToast, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { useChatContext } from '../context/ChatContext';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '../pages/_app';

// Animasyon tanımları
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

export default function UserList() {
  const { users, username: currentUser, logout } = useChatContext();
  const { isDark } = useTheme();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isLogoutAlertOpen, 
    onOpen: onLogoutAlertOpen, 
    onClose: onLogoutAlertClose 
  } = useDisclosure();
  const fileInputRef = useRef(null);
  const cancelRef = useRef(null);
  const toast = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [profileTimestamps, setProfileTimestamps] = useState({});
  const router = useRouter();
  
  // Uzaktan profil resmi güncellemelerini dinle
  useEffect(() => {
    // WebSocket mesajlarını dinlemek için ChatContext ile bağlan
    const handleProfileUpdate = (event) => {
      const { username, timestamp } = event.detail;
      console.log(`Profil güncelleme alındı: ${username}, timestamp: ${timestamp}`);
      
      // Profil zaman damgalarını güncelle
      setProfileTimestamps(prev => ({
        ...prev,
        [username]: timestamp
      }));
      
      // Tüm avatar görüntülerini güncelle
      const allAvatarElements = document.querySelectorAll(`img[src^="http://localhost/profile/"]`);
      allAvatarElements.forEach(element => {
        if (element.src.includes(`/${username}.png`)) {
          element.src = `http://localhost/profile/${username}.png?t=${timestamp}`;
        }
      });
    };
    
    // Yerel olayı dinle (aynı sayfadaki diğer bileşenlerden)
    window.addEventListener('profileUpdated', handleProfileUpdate);
    
    // Temizlik yaparak olay dinleyiciyi kaldır
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);
  
  const handleUserClick = (user) => {
    if (user === currentUser) {
      onOpen();
    }
    // Diğer kullanıcılara tıklandığında bir şey yapma
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current.click();
  };

// Client tarafı (React) - handleFileChange fonksiyonu

// React - UserList.js içinde handleFileChange fonksiyonu

// React - UserList.js içinde handleFileChange fonksiyonu

const handleFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Dosya tipini kontrol et
  if (!file.type.includes('image/')) {
    toast({
      title: "Hata",
      description: "Lütfen bir resim dosyası seçin.",
      status: "error",
      duration: 3000,
      isClosable: true,
    });
    return;
  }

  setIsUploading(true);
  
  try {
    // FormData kullanarak basit bir şekilde dosya yükleme
    const formData = new FormData();
    formData.append('profilePicture', file);
    formData.append('username', currentUser);

    console.log('Gönderilen dosya:', file.name, file.size, file.type);
    console.log('Kullanıcı adı:', currentUser);

    const response = await fetch('http://localhost/profileapi.php', {
      method: 'POST',
      body: formData,
    });

    // Yanıt metnini al
    const responseText = await response.text();
    console.log('Sunucu yanıtı:', responseText);
    
    // JSON'a çevirmeye çalış
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (err) {
      throw new Error('Sunucu yanıtı geçersiz JSON formatında: ' + responseText);
    }

    if (data.success) {
      toast({
        title: "Başarılı",
        description: "Profil fotoğrafınız güncellendi.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      
      // Önbelleği yenilemek için timestamp ekle
      const timestamp = new Date().getTime();
      
      // 1. Tüm kullanıcılara profil fotoğrafı değişikliğini bildir
      // WebSocket veya diğer gerçek zamanlı iletişim kanalı kullanılabilir
      // Örnek: socket.emit('profilePictureUpdated', { username: currentUser, timestamp });
      
      // 2. Geçici çözüm olarak, mevcut sayfadaki tüm avatar görüntülerini güncelle
      const allAvatarElements = document.querySelectorAll(`img[src^="http://localhost/profile/"]`);
      allAvatarElements.forEach(element => {
        // Sadece bu kullanıcının avatarını güncelle
        if (element.src.includes(`/${currentUser}.png`)) {
          element.src = `http://localhost/profile/${currentUser}.png?t=${timestamp}`;
        }
      });
      
      // 3. Sunucuya profil fotoğrafının değiştiğini bildir (WebSocket üzerinden)
      const profileUpdateMsg = {
        type: 'profile_picture_update',
        username: currentUser,
        timestamp: timestamp
      };
      
      // WebSocket üzerinden profile_picture_update mesajı gönder
      try {
        await window.chatAPI.sendMessage(JSON.stringify(profileUpdateMsg));
        console.log('Profil fotoğrafı güncelleme bildirimi gönderildi');
      } catch (err) {
        console.error('Profil güncelleme bildirimi gönderilemedi:', err);
      }
      
      // Ayrıca yerel bir event yayınla
      const profileUpdatedEvent = new CustomEvent('profileUpdated', { 
        detail: { username: currentUser, timestamp } 
      });
      window.dispatchEvent(profileUpdatedEvent);
      
      // Modalı kapat
      onClose();
    } else {
      throw new Error(data.message || 'Bilinmeyen bir hata oluştu');
    }
  } catch (error) {
    console.error('Yükleme hatası:', error);
    toast({
      title: "Hata",
      description: error.message || "Profil fotoğrafı yüklenirken bir hata oluştu.",
      status: "error",
      duration: 5000,
      isClosable: true,
    });
  } finally {
    setIsUploading(false);
  }
};
  // Dosyayı base64'e çeviren yardımcı fonksiyon
  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Base64 verinin header kısmını kaldır (data:image/png;base64,)
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => {
        reject(error);
      };
    });
  };

  const handleLogout = async () => {
    try {
      // Eğer context'te bir logout fonksiyonu varsa, önce onu çağır
      if (typeof logout === 'function') {
        await logout();
      } else {
        // Context'te logout fonksiyonu yoksa, doğrudan sunucuya istek gönder
        const response = await fetch('http://localhost/logout.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username: currentUser }),
          credentials: 'include', // Çerezleri de gönder
        });

        if (!response.ok) {
          throw new Error('Çıkış yapılırken bir hata oluştu');
        }
      }

      // Çıkış başarılıysa, local storage veya session storage'daki verileri temizle
      localStorage.removeItem('chatToken');
      sessionStorage.removeItem('chatUser');
      
      // Başarılı bildirim göster
      toast({
        title: "Çıkış Yapıldı",
        description: "Başarıyla çıkış yaptınız.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Kullanıcıyı giriş sayfasına yönlendir (Next.js için)
      router.push('/login');
    } catch (error) {
      console.error('Çıkış hatası:', error);
      toast({
        title: "Hata",
        description: "Çıkış yapılırken bir hata oluştu.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      onLogoutAlertClose();
      onClose();
    }
  };

  return (
    <Box h="100%" p={4}>
      <VStack align="stretch" spacing={4}>
        <Heading size="md" color="text-primary">Kullanıcılar</Heading>
        
        <Box overflowY="auto" flex="1">
          <List spacing={2}>
            {users.map((user) => (
              <ListItem
                key={user}
                p={2}
                borderRadius="md"
                cursor={user === currentUser ? "pointer" : "default"}
                _hover={{
                  bg: user === currentUser ? (isDark ? "gray.600" : "gray.100") : "transparent",
                  transform: user === currentUser ? "translateX(5px)" : "none"
                }}
                onClick={() => handleUserClick(user)}
                sx={{
                  animation: `${fadeInUp} 0.3s ease-out`,
                  transition: 'all 0.2s ease',
                }}
              >
                <Flex align="center">
                  <Avatar 
                    size="sm" 
                    name={user} 
                    mr={2} 
                    src={`http://localhost/profile/${user}.png${profileTimestamps[user] ? `?t=${profileTimestamps[user]}` : ''}`} 
                  />
                  <Box>
                    <Text fontWeight={user === currentUser ? 'bold' : 'normal'}>
                      {user}
                    </Text>
                    {user === currentUser && (
                      <Badge colorScheme="green" fontSize="xs">Siz</Badge>
                    )}
                  </Box>
                </Flex>
              </ListItem>
            ))}
          </List>
        </Box>
      </VStack>

      {/* Gizli dosya giriş alanı */}
      <Input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        display="none" 
        onChange={handleFileChange}
      />

      {/* Kullanıcı Ayarları Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="bg-sidebar" color="text-primary">
          <ModalHeader>Kullanıcı Ayarları</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <Text>Profil ayarlarınızı buradan değiştirebilirsiniz.</Text>
              {/* Buraya ayar seçenekleri eklenebilir */}
              <Button 
                colorScheme="blue" 
                size="md" 
                onClick={handleProfilePictureClick}
                isLoading={isUploading}
                loadingText="Yükleniyor..."
              >
                Profil Fotoğrafını Değiştir
              </Button>
              <Button 
                colorScheme="red" 
                size="md" 
                variant="outline"
                onClick={onLogoutAlertOpen}
              >
                Çıkış Yap
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Çıkış onay dialog'u */}
      <AlertDialog
        isOpen={isLogoutAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={onLogoutAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="bg-sidebar" color="text-primary">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Çıkış Yap
            </AlertDialogHeader>

            <AlertDialogBody>
              Çıkış yapmak istediğinize emin misiniz?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onLogoutAlertClose}>
                İptal
              </Button>
              <Button colorScheme="red" onClick={handleLogout} ml={3}>
                Çıkış Yap
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}