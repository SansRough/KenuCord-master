import { useState, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  List,
  ListItem,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text,
  Badge,
  Divider,
  useColorModeValue,
  Switch,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  HStack,
} from '@chakra-ui/react';
import { BellIcon, DeleteIcon, MoonIcon, TimeIcon } from '@chakra-ui/icons';
import { useChatContext } from '../context/ChatContext';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function NotificationPanel() {
  const {
    notifications,
    totalUnreadCount,
    hasMentions,
    clearAllNotifications,
    doNotDisturb,
    doNotDisturbUntil,
    toggleDoNotDisturb,
    enableDoNotDisturbFor,
  } = useChatContext();
  const [isOpen, setIsOpen] = useState(false);
  const timeMenuRef = useRef(null);

  // Bildirim tipine göre renkler
  const notificationColors = {
    mention: 'purple.500',
    unread_message: 'blue.500',
    new_room: 'green.500',
    profile_update: 'orange.500',
    room_switch: 'teal.500',
  };

  // Bildirim tipine göre başlıklar
  const notificationTitles = {
    mention: 'Bahsedilme',
    unread_message: 'Yeni Mesaj',
    new_room: 'Yeni Oda',
    profile_update: 'Profil Güncellemesi',
    room_switch: 'Oda Değişimi',
  };

  // Zaman çevirisi
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(new Date(timestamp * 1000), { 
        addSuffix: true,
        locale: tr 
      });
    } catch (error) {
      return '';
    }
  };

  // Bildirimleri temizle
  const handleClearNotifications = () => {
    clearAllNotifications();
    setIsOpen(false);
  };
  
  // Rahatsız Etme modunu değiştir
  const handleToggleDoNotDisturb = () => {
    console.log("NotificationPanel - Rahatsız Etme modu değiştiriliyor, mevcut durum:", doNotDisturb);
    const result = toggleDoNotDisturb();
    console.log("NotificationPanel - Toggle sonrası dönen değer:", result);
  };
  
  // Belirli bir süre için Rahatsız Etme modunu aktifleştir
  const handleEnableForDuration = (minutes) => {
    enableDoNotDisturbFor(minutes);
    if (timeMenuRef.current) {
      timeMenuRef.current.click(); // Menüyü kapat
    }
  };
  
  // Kalan süreyi formatla
  const formatRemainingTime = () => {
    if (!doNotDisturbUntil) return '';
    
    const now = new Date();
    const endTime = new Date(doNotDisturbUntil);
    
    if (endTime <= now) return '';
    
    const diffMs = endTime - now;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    
    if (diffHours > 0) {
      return `${diffHours} saat ${remainingMins > 0 ? `${remainingMins} dk` : ''}`;
    }
    return `${diffMins} dakika`;
  };
  
  // Bildirim ikonu rengini ayarla
  const iconColor = doNotDisturb === true
    ? "gray.400" // Rahatsız Etme modu açıkken soluk renk
    : hasMentions === true
      ? "purple.500" // Bahsedilme varsa mor
      : totalUnreadCount > 0 
        ? "red.500" // Okunmamış mesaj varsa kırmızı
        : "inherit"; // Normal durumda normal renk

  return (
    <Popover
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-end"
      closeOnBlur={true}
    >
      <PopoverTrigger>
        <Box position="relative">
          <Tooltip 
            label={doNotDisturb === true 
              ? `Rahatsız Etme Modu Açık${doNotDisturbUntil ? ` (${formatRemainingTime()} kaldı)` : ''}` 
              : "Bildirimler"
            }
          >
            <IconButton
              aria-label="Bildirimler"
              icon={<BellIcon />}
              variant="ghost"
              size="md"
              onClick={() => setIsOpen(!isOpen)}
              position="relative"
              color={iconColor}
              opacity={doNotDisturb === true ? 0.6 : 1}
              _hover={{ opacity: doNotDisturb === true ? 0.8 : 0.8 }}
            />
          </Tooltip>
          
          {/* Bildirim sayısı - Rahatsız Etme modu açık değilse göster */}
          {doNotDisturb !== true && totalUnreadCount > 0 && (
            <Badge
              colorScheme="red"
              borderRadius="full"
              position="absolute"
              top="-5px"
              right="-5px"
              fontSize="xs"
            >
              {totalUnreadCount}
            </Badge>
          )}
          
          {/* Bahsedilme göstergesi - Rahatsız Etme modu açık değilse göster */}
          {doNotDisturb !== true && hasMentions && (
            <Box
              position="absolute"
              bottom="-2px"
              right="-2px"
              w="10px"
              h="10px"
              borderRadius="full"
              bg="purple.500"
            />
          )}
          
          {/* Rahatsız Etme modu göstergesi */}
          {doNotDisturb === true && (
            <Box
              position="absolute"
              bottom="-3px"
              right="-3px"
              w="12px"
              h="12px"
              borderRadius="full"
              bg="red.500"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box 
                as="span" 
                fontSize="8px" 
                color="white" 
                fontWeight="bold"
              >
                Z
              </Box>
            </Box>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent width="350px" maxH="500px">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader fontWeight="bold">
          <Flex justify="space-between" align="center">
            <Heading size="sm">Bildirimler</Heading>
            <HStack spacing={2}>
              <Button
                size="xs"
                leftIcon={<DeleteIcon />}
                onClick={handleClearNotifications}
                colorScheme="red"
                variant="ghost"
              >
                Temizle
              </Button>
            </HStack>
          </Flex>
        </PopoverHeader>
        
        {/* Rahatsız Etme modu bölümü */}
        <Box p={3} borderBottom="1px" borderColor="gray.200">
          <Flex justify="space-between" align="center">
            <HStack>
              <MoonIcon color={doNotDisturb === true ? "red.500" : "gray.400"} />
              <Text fontWeight="medium">Rahatsız Etme Modu</Text>
              {doNotDisturbUntil && (
                <Badge colorScheme="red" variant="outline" fontSize="xs">
                  {formatRemainingTime()}
                </Badge>
              )}
            </HStack>
            <Switch 
              isChecked={doNotDisturb === true} 
              onChange={handleToggleDoNotDisturb} 
              colorScheme="red"
              id="doNotDisturbSwitch"
            />
          </Flex>
          
          {/* Zamanlayıcı menüsü */}
          {doNotDisturb === true && (
            <Flex mt={2} justify="flex-end">
              <Menu>
                <Tooltip label="Süre Ayarla">
                  <MenuButton 
                    as={Button} 
                    rightIcon={<TimeIcon />} 
                    size="xs" 
                    variant="outline"
                    ref={timeMenuRef}
                  >
                    {doNotDisturbUntil ? 'Süreyi Değiştir' : 'Süre Ayarla'}
                  </MenuButton>
                </Tooltip>
                <MenuList>
                  <MenuItem onClick={() => handleEnableForDuration(30)}>30 dakika</MenuItem>
                  <MenuItem onClick={() => handleEnableForDuration(60)}>1 saat</MenuItem>
                  <MenuItem onClick={() => handleEnableForDuration(180)}>3 saat</MenuItem>
                  <MenuItem onClick={() => handleEnableForDuration(480)}>8 saat</MenuItem>
                </MenuList>
              </Menu>
            </Flex>
          )}
        </Box>
        
        <PopoverBody overflowY="auto" maxH="400px" p={0}>
          {notifications.length === 0 ? (
            <Box p={4} textAlign="center">
              <Text color="gray.500">Bildirim yok</Text>
            </Box>
          ) : (
            <List spacing={0}>
              {notifications.map((notification, index) => (
                <ListItem key={index} borderBottomWidth={index < notifications.length - 1 ? 1 : 0} borderColor="gray.200">
                  <Box
                    p={3}
                    _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
                    borderLeft="4px solid"
                    borderColor={notificationColors[notification.notification_type] || 'gray.500'}
                  >
                    <Flex justify="space-between" mb={1}>
                      <Text fontWeight="bold" fontSize="sm">
                        {notificationTitles[notification.notification_type] || 'Bildirim'}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatTime(notification.timestamp)}
                      </Text>
                    </Flex>
                    <Text fontSize="sm">{notification.content}</Text>
                    {notification.sender && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        Gönderen: {notification.sender}
                      </Text>
                    )}
                    {notification.room && (
                      <Badge size="sm" colorScheme="blue" mt={1}>
                        {notification.room}
                      </Badge>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
} 