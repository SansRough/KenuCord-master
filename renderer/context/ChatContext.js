import { createContext, useContext, useState, useEffect, useRef } from "react";
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
} from "@chakra-ui/react";
const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [username, setUsername] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState(["lobby"]);
  const [currentRoom, setCurrentRoom] = useState("lobby");

  // Bildirim sistemi için state'ler
  const [notifications, setNotifications] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [hasMentions, setHasMentions] = useState(false);
  
  // Rahatsız Etme modu için state
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [doNotDisturbUntil, setDoNotDisturbUntil] = useState(null);
  
  // Yazıyor göstergesi için state
  const [typingUsers, setTypingUsers] = useState({});
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const toast = useToast();

  // Yazıyor durumunu bildirme
  const sendTypingStatus = async (isTyping) => {
    try {
      const messageObj = {
        type: "typing_status",
        is_typing: isTyping,
        room: currentRoom
      };

      await window.chatAPI.sendMessage(
        JSON.stringify(messageObj)
      );
      
      setIsTyping(isTyping);
    } catch (error) {
      console.error("Yazıyor durumu bildirme hatası:", error);
    }
  };
  
  // Kullanıcı yazarken sendTypingStatus'u çağırmak için kullanılacak fonksiyon
  const handleTyping = () => {
    // Kullanıcı yazıyorsa ve daha önce typing durumu gönderilmemişse
    if (!isTyping) {
      sendTypingStatus(true);
    }
    
    // Varolan timeout'u temizle
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Kullanıcı 3 saniye yazmayı bıraktığında typing durumunu false yap
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 3000);
  };

  // Rahatsız Etme modunu açıp kapatma fonksiyonu
  const toggleDoNotDisturb = () => {
    try {
      // localStorage'dan değeri oku (bu en güvenilir kaynak)
      const storedValue = localStorage.getItem('kenucord-dnd-enabled');
      
      // Mevcut durumu kontrol et (localStorage'dan)
      const currentState = storedValue === 'true';
      console.log("toggleDoNotDisturb - mevcut durum (localStorage'dan):", currentState);
      console.log("toggleDoNotDisturb - mevcut doNotDisturb state değeri:", doNotDisturb, "typeof:", typeof doNotDisturb);
      
      // Tutarsızlık varsa uyar
      if ((doNotDisturb === true && storedValue !== 'true') || 
          (doNotDisturb !== true && storedValue === 'true')) {
        console.warn("toggleDoNotDisturb - State ve localStorage tutarsız, localStorage değeri baz alınıyor");
      }
      
      // Yeni durum - localStorage değerinin tersini al
      const newState = !currentState;
      console.log("toggleDoNotDisturb - Yeni durum:", newState);
      
      // State'i güncelle - tam boolean değer
      setDoNotDisturb(newState);
      
      // LocalStorage'a kaydet - string olarak
      localStorage.setItem('kenucord-dnd-enabled', newState ? 'true' : 'false');
      console.log("toggleDoNotDisturb - LocalStorage güncellendi:", newState ? 'true' : 'false');
      
      // Zamanlayıcı ve süre temizliği
      if (newState === false) {
        setDoNotDisturbUntil(null);
        localStorage.removeItem('kenucord-dnd-until');
        
        if (window.doNotDisturbTimer) {
          clearTimeout(window.doNotDisturbTimer);
          window.doNotDisturbTimer = null;
        }
      }
      
      // Kullanıcıya bilgi ver
      showInfoToast(
        newState ? "Rahatsız Etme Modu Açık" : "Rahatsız Etme Modu Kapalı",
        newState ? "Bildirimler geçici olarak kapatıldı." : "Bildirimleri tekrar alacaksınız."
      );
      
      // Son doğrulama - çift kontrolle gerçek değeri döndür
      const verifiedState = localStorage.getItem('kenucord-dnd-enabled') === 'true';
      console.log("toggleDoNotDisturb - İşlem sonrası doğrulama:", verifiedState);
      
      return verifiedState;
    } catch (error) {
      console.error("toggleDoNotDisturb hata:", error);
      // Hata durumunda sıfırla
      resetDoNotDisturbSettings();
      return false;
    }
  };
  
  // Belirli bir süre için Rahatsız Etme modunu aktifleştirme
  const enableDoNotDisturbFor = (durationMinutes) => {
    try {
      // Giriş parametrelerini kontrol et
      if (!durationMinutes || durationMinutes <= 0) {
        console.error("Geçersiz süre:", durationMinutes);
        return false;
      }
      
      console.log("enableDoNotDisturbFor çağrıldı - süre:", durationMinutes, "dakika");
      
      // Varolan zamanlayıcıyı temizle
      if (window.doNotDisturbTimer) {
        clearTimeout(window.doNotDisturbTimer);
        window.doNotDisturbTimer = null;
      }
      
      // Bitiş zamanını hesapla
      const endTime = new Date();
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);
      
      // Ayarları uygula
      setDoNotDisturb(true);
      setDoNotDisturbUntil(endTime);
      
      // LocalStorage'a direkt kaydet
      localStorage.setItem('kenucord-dnd-enabled', 'true');
      localStorage.setItem('kenucord-dnd-until', endTime.getTime().toString());
      
      console.log("enableDoNotDisturbFor - Ayarlar kaydedildi, bitiş zamanı:", endTime);
      
      // Zamanlayıcı ayarla
      window.doNotDisturbTimer = setTimeout(() => {
        // Süre dolduğunda kapatırken de boolean değer kullan
        setDoNotDisturb(false);
        setDoNotDisturbUntil(null);
        
        // LocalStorage'u güncelle
        localStorage.setItem('kenucord-dnd-enabled', 'false');
        localStorage.removeItem('kenucord-dnd-until');
        
        console.log("enableDoNotDisturbFor - Süre doldu, mod kapatıldı");
        
        showInfoToast(
          "Rahatsız Etme Modu Kapatıldı", 
          "Belirlediğiniz süre doldu. Bildirimleri tekrar alacaksınız."
        );
      }, durationMinutes * 60 * 1000);
      
      // Kullanıcıya bilgi ver
      showInfoToast(
        "Rahatsız Etme Modu Açık", 
        `Bildirimler ${durationMinutes} dakika boyunca kapatıldı.`
      );
      
      return true;
    } catch (error) {
      console.error("enableDoNotDisturbFor hata:", error);
      // Hata durumunda false döndür ve normal duruma geri dön
      setDoNotDisturb(false);
      setDoNotDisturbUntil(null);
      localStorage.setItem('kenucord-dnd-enabled', 'false');
      localStorage.removeItem('kenucord-dnd-until');
      return false;
    }
  };
  
  // Rahatsız Etme modu ayarlarını sıfırla ve tüm durumu temizle
  const resetDoNotDisturbSettings = () => {
    console.log("resetDoNotDisturbSettings çağrıldı - tüm ayarlar sıfırlanıyor");
    
    // State'leri temizle
    setDoNotDisturb(false);
    setDoNotDisturbUntil(null);
    
    // Zamanlayıcıyı temizle
    if (window.doNotDisturbTimer) {
      clearTimeout(window.doNotDisturbTimer);
      window.doNotDisturbTimer = null;
    }
    
    // localStorage'ı temizle
    localStorage.setItem('kenucord-dnd-enabled', 'false');
    localStorage.removeItem('kenucord-dnd-until');
    
    console.log("Rahatsız Etme modu ayarları sıfırlandı, doNotDisturb:", false);
    
    // Kullanıcıya bilgi ver
    showInfoToast(
      "Rahatsız Etme Modu Sıfırlandı",
      "Bildirim ayarları varsayılan duruma getirildi."
    );
  };
  
  // Uygulama başlatılırken doNotDisturb ayarlarını ilklendir
  const initializeDoNotDisturbSettings = () => {
    try {
      console.log("initializeDoNotDisturbSettings çağrıldı - başlangıç durumu kontrol ediliyor");
      
      // Mevcut localStorage değerlerini kontrol et
      const storedValue = localStorage.getItem('kenucord-dnd-enabled');
      console.log("Mevcut localStorage değeri:", storedValue);
      
      // Değer belirsizse veya geçersizse, temiz bir başlangıç yap
      if (storedValue !== 'true' && storedValue !== 'false') {
        console.log("Geçersiz değer bulundu, varsayılan olarak false ayarlanıyor");
        resetDoNotDisturbSettings();
        return;
      }
      
      // Değer geçerliyse, doğru bir şekilde yükle
      loadDoNotDisturbSettings();
    } catch (error) {
      console.error("DoNotDisturb ayarları ilklendirilirken hata:", error);
      // Hata durumunda temiz başlangıç
      resetDoNotDisturbSettings();
    }
  };

  // Rahatsız Etme modu ayarlarını yükle
  const loadDoNotDisturbSettings = () => {
    try {
      console.log("loadDoNotDisturbSettings başlatılıyor - mevcut doNotDisturb değeri:", doNotDisturb);
      
      // localStorage'dan değeri al ve durumu belirle
      const storedValue = localStorage.getItem('kenucord-dnd-enabled');
      console.log("localStorage'dan okunan ham değer:", storedValue, "typeof:", typeof storedValue);
      
      // Eğer doNotDisturb değeri tanımsız veya null ise, varsayılan false yap
      if (doNotDisturb === undefined || doNotDisturb === null) {
        setDoNotDisturb(false);
      }
      
      // localStorage'da geçerli bir değer yoksa, resetle
      if (storedValue !== 'true' && storedValue !== 'false') {
        console.warn("loadDoNotDisturbSettings - Geçersiz localStorage değeri, sıfırlanıyor");
        resetDoNotDisturbSettings();
        return;
      }
      
      // Açıkça string kontrolü yap ve boolean dönüşümü yap
      const isEnabled = storedValue === 'true';
      console.log("Dönüştürülmüş boolean değeri:", isEnabled, "typeof:", typeof isEnabled);
      
      // Süre bilgisini al
      const untilTimestamp = localStorage.getItem('kenucord-dnd-until');
      
      // State ve localStorage arasında tutarsızlık varsa
      if ((doNotDisturb === true && !isEnabled) || (doNotDisturb !== true && isEnabled)) {
        console.warn("loadDoNotDisturbSettings - State ve localStorage arasında tutarsızlık var");
        // localStorage değerini baz alarak düzelt
        setDoNotDisturb(isEnabled);
      }
      
      // Eğer Rahatsız Etme modu aktifse ve bir bitiş zamanı varsa
      if (isEnabled && untilTimestamp) {
        const endTime = new Date(parseInt(untilTimestamp, 10));
        const now = new Date();
        
        console.log("Bitiş zamanı:", endTime, "Şimdi:", now);
        
        // Eğer bitiş zamanı gelecekte ise
        if (endTime > now) {
          setDoNotDisturbUntil(endTime);
          
          // Kalan süre için zamanlayıcı ayarla
          const remainingMs = endTime.getTime() - now.getTime();
          window.doNotDisturbTimer = setTimeout(() => {
            // Süre dolduğunda kapatırken de boolean değer kullan
            setDoNotDisturb(false);
            setDoNotDisturbUntil(null);
            
            // LocalStorage'u güncelle
            localStorage.setItem('kenucord-dnd-enabled', 'false');
            localStorage.removeItem('kenucord-dnd-until');
            
            console.log("loadDoNotDisturbSettings - Zamanlayıcı bitti, Rahatsız Etme modu kapatıldı");
            
            showInfoToast(
              "Rahatsız Etme Modu Kapatıldı", 
              "Belirlediğiniz süre doldu. Bildirimleri tekrar alacaksınız."
            );
          }, remainingMs);
          
          console.log(`Rahatsız Etme modu için zamanlayıcı ayarlandı: ${Math.round(remainingMs / 1000 / 60)} dakika`);
        } else {
          // Bitiş zamanı geçmişte kalmış, temizle
          console.log("Bitiş zamanı geçmiş, Rahatsız Etme modu kapatılıyor");
          resetDoNotDisturbSettings();
        }
      } else if (isEnabled) {
        // Süresiz Rahatsız Etme modu
        console.log("Süresiz Rahatsız Etme modu aktif");
        setDoNotDisturb(true);
        setDoNotDisturbUntil(null);
      } else {
        // Rahatsız Etme modu kapalı
        console.log("Rahatsız Etme modu kapalı");
        setDoNotDisturb(false);
        setDoNotDisturbUntil(null);
        // Zamanlayıcıyı temizle
        if (window.doNotDisturbTimer) {
          clearTimeout(window.doNotDisturbTimer);
          window.doNotDisturbTimer = null;
        }
      }
      
      // Uygulamanın Rahatsız Etme modu durumunu logla
      console.log("loadDoNotDisturbSettings - İşlem tamamlandı, doNotDisturb:", doNotDisturb);
    } catch (error) {
      console.error("loadDoNotDisturbSettings hata:", error);
      resetDoNotDisturbSettings();
    }
  };

  // Uygulama başlatıldığında Rahatsız Etme modu ayarlarını yükle
  useEffect(() => {
    initializeDoNotDisturbSettings();
  }, []);

  // Bağlantı parametrelerini doğrulama
  const validateConnectionParams = (host, port, username) => {
    const errors = [];

    if (!host || typeof host !== "string" || host.trim() === "") {
      errors.push("Geçerli bir sunucu adresi girmelisiniz.");
    }

    if (!port) {
      errors.push("Port numarası girmelisiniz.");
    } else {
      const portNum = parseInt(port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        errors.push("Geçerli bir port numarası girmelisiniz (1-65535).");
      }
    }

    if (!username || typeof username !== "string" || username.trim() === "") {
      errors.push("Kullanıcı adı girmelisiniz.");
    } else if (username.length < 3) {
      errors.push("Kullanıcı adı en az 3 karakter olmalıdır.");
    }

    return errors;
  };

  // İyileştirilmiş bağlantı kurma fonksiyonu
  const connect = async (host, port, name, password) => {
    try {
      // Bağlantı öncesi girdileri doğrula
      const validationErrors = validateConnectionParams(host, port, name);
      if (validationErrors.length > 0) {
        // Tüm hataları birleştirip göster
        const errorMessage = validationErrors.join("\n");
        showErrorToast("Bağlantı Hatası", errorMessage);
        throw new Error(errorMessage);
      }

      // Mevcut bağlantıyı kontrol et
      if (isConnected) {
        await disconnect();
      }

      // Bağlantı kurma isteğini gönder
      const response = await window.chatAPI.connectToServer({
        host: host.trim(),
        port: parseInt(port, 10),
        username: name.trim(),
        password: password || "", // Password boş olabilir
      });

      if (!response.success) {
        throw new Error(response.error || "Bağlantı hatası");
      }

      // Bağlantı başarılı, durumu güncelle
      setUsername(name.trim());
      setIsConnected(true);
      setCurrentRoom("lobby");

      // Olay dinleyicilerini ayarla
      window.chatAPI.onMessageReceived(handleMessage);
      window.chatAPI.onConnectionClosed(handleDisconnect);

      // Bağlantı başarılı bildirimi göster
      showInfoToast(
        "Bağlantı Başarılı",
        `${host}:${port} sunucusuna bağlandınız.`,
      );

      // Oda listesini al - bağlantı kurulduğunda zorla güncelle
      setTimeout(() => {
        getRooms(true); // forceUpdate = true
      }, 500); // Sunucunun hazır olması için kısa bir gecikme

      return true;
    } catch (error) {
      console.error("Bağlantı hatası:", error);
      showErrorToast(
        "Bağlantı Hatası",
        error.message || "Sunucuya bağlanırken bir hata oluştu.",
      );
      throw error;
    }
  };

  // Mesaj gönderme
  const sendMessage = async (text) => {
    try {
      const messageObj = {
        type: "message",
        msg: text,
      };

      const response = await window.chatAPI.sendMessage(
        JSON.stringify(messageObj),
      );

      if (!response.success) {
        throw new Error(response.error || "Mesaj gönderilemedi");
      }
      
      // Mesaj gönderildikten sonra yazıyor durumunu temizle
      if (isTyping) {
        sendTypingStatus(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      }
    } catch (error) {
      console.error("Mesaj gönderme hatası:", error);
    }
  };

  // Oda değiştirme
  const switchRoom = async (room, password = null) => {
    try {
      const messageObj = {
        type: "switch_room",
        room: room,
      };

      if (password) {
        messageObj.password = password;
      }

      const response = await window.chatAPI.sendMessage(
        JSON.stringify(messageObj),
      );

      if (!response.success) {
        throw new Error(response.error || "Oda değiştirilemedi");
      }

      // Başarılı yanıt aldığımızda, oda değişikliğini hemen uygulayalım
      // Sunucu tarafından bir hata gelmezse, bu işlem başarılı olmuş demektir
      setCurrentRoom(room);
      setMessages([]);
    } catch (error) {
      console.error("Oda değiştirme hatası:", error);
    }
  };

  // Oda oluşturma
  const createRoom = async (roomName, roomType, password = null) => {
    try {
      const messageObj = {
        type: "create_room",
        room: roomName,
        room_type: roomType,
      };

      if (password) {
        messageObj.password = password;
      }

      const response = await window.chatAPI.sendMessage(
        JSON.stringify(messageObj),
      );

      if (!response.success) {
        throw new Error(response.error || "Oda oluşturulamadı");
      }

      // Oda oluşturma sonrası odaları güncelle
      getRooms(true); // forceUpdate = true
    } catch (error) {
      console.error("Oda oluşturma hatası:", error);
    }
  };

  // Oda listesi istek zamanını izleyen değişken
  const [lastRoomFetchTime, setLastRoomFetchTime] = useState(0);

  // Oda listesini alma - Optimizasyon: istek sıklığı kontrolü eklendi
  const getRooms = async (forceUpdate = false) => {
    try {
      // Son istek üzerinden geçen süreyi kontrol et (10 saniye aralık)
      const now = Date.now();
      const timeSinceLastFetch = now - lastRoomFetchTime;

      // Eğer zorla güncelleme istenmediyse ve son istekten bu yana 10 saniyeden az geçtiyse
      // yeni istek gönderme
      if (!forceUpdate && timeSinceLastFetch < 10000) {
        console.log(
          "Oda listesi isteği rate limit nedeniyle engellendi:",
          `Son istekten bu yana ${Math.round(timeSinceLastFetch / 1000)} saniye geçti.`,
        );
        return;
      }

      const messageObj = {
        type: "get_rooms",
      };

      const response = await window.chatAPI.sendMessage(
        JSON.stringify(messageObj),
      );
      setLastRoomFetchTime(now);

      if (!response.success) {
        throw new Error(response.error || "Oda listesi alınamadı");
      }
    } catch (error) {
      console.error("Oda listesi alma hatası:", error);
    }
  };

  // Bağlantıyı kesme
  const disconnect = async () => {
    try {
      const response = await window.chatAPI.disconnect();

      if (!response.success) {
        throw new Error(response.error || "Bağlantı kesme hatası");
      }

      handleDisconnect();
    } catch (error) {
      console.error("Bağlantı kesme hatası:", error);
    }
  };

  // Hata mesajlarını göstermek için yardımcı fonksiyon
  const showErrorToast = (title, description) => {
    toast({
      title,
      description,
      status: "error",
      duration: 5000,
      isClosable: true,
    });
  };

  // Bilgi mesajlarını göstermek için yardımcı fonksiyon
  const showInfoToast = (title, description) => {
    toast({
      title,
      description,
      status: "info",
      duration: 3000,
      isClosable: true,
    });
  };

  // Bildirimin gösterilip gösterilmeyeceğini kontrol et
  const shouldShowNotification = () => {
    try {
      // LocalStorage ile uygulamanın mevcut durumunu karşılaştır
      const storedValue = localStorage.getItem('kenucord-dnd-enabled');
      const currentState = doNotDisturb === true;
      
      // Debug için log
      console.log("shouldShowNotification - Rahatsız Etme modu state:", currentState, 
                 "localStorage:", storedValue, 
                 "typeof doNotDisturb:", typeof doNotDisturb);
      
      // Tutarsızlık varsa uyar ve düzelt
      if ((currentState && storedValue !== 'true') || (!currentState && storedValue === 'true')) {
        console.warn("shouldShowNotification - Tutarsızlık tespit edildi, düzeltiliyor");
        if (storedValue === 'true') {
          setDoNotDisturb(true);
          return false; // Bildirim gösterme
        } else {
          setDoNotDisturb(false);
          return true; // Bildirim göster
        }
      }
      
      // Rahatsız Etme modu açıksa bildirimi engelle
      if (currentState) {
        console.log("Rahatsız Etme modu aktif, bildirim engellendi");
        return false;
      }
      
      // Diğer durumlarda bildirimi göster
      return true;
    } catch (error) {
      console.error("shouldShowNotification hata:", error);
      // Hata durumunda true döndür ve bildirimleri göster
      return true;
    }
  };

  // Masaüstü bildirimi göster
  const showDesktopNotification = (title, message) => {
    try {
      // Bildirimin gösterilip gösterilmeyeceğini kontrol et
      if (!shouldShowNotification()) {
        console.log("showDesktopNotification - Rahatsız Etme modu aktif, bildirim engellendi");
        return;
      }
      
      // Bildirim izni yoksa gösterme
      if (Notification.permission !== "granted") {
        console.log("Bildirim izni verilmemiş");
        return;
      }

      // Bildirim oluştur
      const notification = new Notification(title, {
        body: message,
        icon: "/icon.png",
      });

      // Bildirime tıklanınca odaklan
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      console.log("Masaüstü bildirimi gösterildi:", title);
    } catch (error) {
      console.error("Masaüstü bildirimi gösterilemedi:", error);
    }
  };

  // Bildirim ekle
  const addNotification = (notification) => {
    // Rahatsız Etme modu açıksa bildirimi engelle (tam boolean karşılaştırma)
    if (doNotDisturb === true) {
      console.log("addNotification - Rahatsız Etme modu aktif, bildirim eklenmedi:", notification);
      return;
    }

    // Yeni bildirimi listeye ekle ve 50 ile sınırla
    setNotifications((prev) => [notification, ...prev].slice(0, 50));

    // Bildirim tipine göre sayaçları güncelle
    if (notification.notification_type === "mention") {
      setHasMentions(true);
    } else if (notification.notification_type === "unread_message") {
      if (notification.room) {
        setUnreadMessages((prev) => ({
          ...prev,
          [notification.room]: (prev[notification.room] || 0) + 1,
        }));
      }
    }
  };
  
  // Toplam okunmamış mesaj sayısını güncelle
  const updateTotalUnreadCount = () => {
    setTotalUnreadCount((prevTotal) => {
      const newTotal = Object.values(unreadMessages).reduce(
        (sum, count) => sum + count,
        0
      );
      return newTotal;
    });
  };

  // Sunucudan gelen mesajları işleme - Bildirim sistemi ile geliştirilmiş sürüm
  const handleMessage = (message) => {
    if (!message || typeof message !== "object") {
      console.error("Geçersiz mesaj formatı:", message);
      return;
    }

    // Mesaj tipini kontrol et
    const messageType = message.type || "unknown";
    console.log(`Gelen mesaj (${messageType}):`, message);

    // Mesaj işleyici fonksiyonları - Kod tekrarını azaltmak için
    const messageHandlers = {
      // Yazıyor bildirimi
      typing_status: () => {
        if (message.username && message.room === currentRoom) {
          if (message.is_typing) {
            // Kullanıcı yazmaya başladı
            setTypingUsers(prev => ({
              ...prev,
              [message.username]: Date.now()
            }));
          } else {
            // Kullanıcı yazmayı bıraktı
            setTypingUsers(prev => {
              const newTypingUsers = { ...prev };
              delete newTypingUsers[message.username];
              return newTypingUsers;
            });
          }
        }
      },
      
      // Sohbet mesajı
      message: () => {
        setMessages((prev) => [...prev, message]);
        
        // Mesajın hangi kullanıcıdan geldiğini belirle
        const messageText = message.msg || "";
        let senderUsername = message.sender;
        
        // Eğer sender belirtilmemişse, mesaj formatından çıkar (username: content)
        if (!senderUsername && messageText.includes(":")) {
          senderUsername = messageText.split(":")[0].trim();
        }
        
        // Mesaj gönderildiğinde, o kullanıcının typing durumunu temizle
        if (senderUsername) {
          setTypingUsers(prev => {
            const newTypingUsers = { ...prev };
            delete newTypingUsers[senderUsername];
            return newTypingUsers;
          });
        }
        
        console.log("Mesaj alındı:", {
          sender: senderUsername,
          currentUser: username,
          isSelf: senderUsername === username,
          currentRoom: currentRoom,
          messageRoom: message.room,
        });
        
        // Eğer mesaj başka bir kullanıcıdan geldiyse ve mevcut odada değilsek bildirim göster
        if (senderUsername && message.room && message.room !== currentRoom) {
          // Rahatsız Etme modu aktifse bildirimleri engelle (tam boolean karşılaştırma)
          if (doNotDisturb === true) {
            console.log("handleMessage - Rahatsız Etme modu aktif, bildirim engellendi:", message);
            return;
          }
          
          // Kendimizden gelen mesajları kontrol et - birçok farklı format için
          const isOwnMessage =
            senderUsername === username ||
            senderUsername.includes(username) ||
            messageText.startsWith(username) ||
            (message.sender && message.sender === username);

          if (isOwnMessage) {
            console.log("Kendi mesajımız olduğu için bildirim gösterilmiyor:", {
              senderUsername,
              username,
              messageText,
            });
            return;
          }

          // Mesajı kısalt
          const shortMessage =
            messageText.length > 50
              ? messageText.substring(0, 50) + "..."
              : messageText;

          console.log("Bildirim gösteriliyor:", {
            senderUsername,
            room: message.room,
            shortMessage,
            isOwnMessage,
          });

          // Bildirim sesi çal
          playNotificationSound("message", senderUsername, message.room);

          // Masaüstü bildirimi göster
          showDesktopNotification(
            `Yeni Mesaj: ${message.room}`,
            shortMessage
          );

          // Bildirim paneline ekle
          addNotification({
            notification_type: "unread_message",
            content: shortMessage,
            sender: senderUsername,
            room: message.room,
            timestamp: Math.floor(Date.now() / 1000),
          });

          // Okunmamış mesaj sayacını artır
          setUnreadMessages((prev) => ({
            ...prev,
            [message.room]: (prev[message.room] || 0) + 1,
          }));
          
          // Toplam sayacı da güncelle
          updateTotalUnreadCount();
        }
      },

      // Oda kullanıcı listesi
      room_users: () => {
        // Kullanıcı listesini güncelle
        if (Array.isArray(message.users)) {
          setUsers(message.users);
        } else {
          console.warn("Geçersiz kullanıcı listesi:", message.users);
          setUsers([]);
        }

        // Oda bilgisi varsa, oda değişimi güncelle
        if (message.room && typeof message.room === "string") {
          setCurrentRoom(message.room);
        }
      },

      // Oda listesi güncellemesi - sunucudan gelen otomatik güncelleme
      room_list: () => {
        if (Array.isArray(message.rooms)) {
          // Gelen oda listesini mevcut liste ile karşılaştır
          const newRooms = message.rooms;
          const currentRooms = rooms;

          // Eğer değişiklik varsa state'i güncelle
          if (JSON.stringify(newRooms) !== JSON.stringify(currentRooms)) {
            console.log("Oda listesi güncellendi:", newRooms);
            setRooms(newRooms);

            // Son güncelleme zamanını da güncelle (istek gönderilmeden güncellenmiş gibi)
            setLastRoomFetchTime(Date.now());
          } else {
            console.log("Oda listesinde değişiklik yok, güncelleme yapılmadı.");
          }
        } else {
          console.warn("Geçersiz oda listesi:", message.rooms);
          setRooms(["lobby"]);
        }
      },

      // Oda oluşturma başarılı
      room_created: () => {
        const roomName = message.room || "Yeni oda";
        showInfoToast(
          "Oda Oluşturuldu",
          `"${roomName}" odası başarıyla oluşturuldu.`,
        );
        // Oda listesini zorla güncelle
        getRooms(true);
      },

      // Oda değiştirme başarılı
      room_switched: () => {
        if (message.room && typeof message.room === "string") {
          setCurrentRoom(message.room);
          setMessages([]); // Oda değişince mesaj geçmişini temizle
          showInfoToast(
            "Oda Değiştirildi",
            `"${message.room}" odasına geçiş yapıldı.`,
          );
        }
      },

      // Profil fotoğrafı güncelleme
      profile_picture_update: () => {
        // Profil fotoğrafı güncellemesi bildirimini yerel event olarak ilet
        const profileUpdatedEvent = new CustomEvent("profileUpdated", {
          detail: {
            username: message.username,
            timestamp: message.timestamp,
          },
        });
        window.dispatchEvent(profileUpdatedEvent);
      },

      // Bildirim
      notification: () => {
        try {
          // Bildirimin gösterilip gösterilmeyeceğini kontrol et (yeni güçlendirilmiş fonksiyon)
          if (!shouldShowNotification()) {
            console.log("notification handler - Rahatsız Etme modu aktif, bildirim engellendi");
            return;
          }
          
          // Bildirim mevcut oda ile ilgiliyse ve bazı tiplerdeyse gösterme
          if (
            message.room === currentRoom &&
            message.notification_type === "unread_message"
          ) {
            console.log("Bildirim mevcut oda ile ilgili, gösterilmiyor:", {
              currentRoom,
              type: message.notification_type,
            });
            return;
          }

          // Göndericinin kendisine bildirim göstermesini engelle
          if (message.sender && username && message.sender === username) {
            console.log("Kendi mesajımız için bildirim gösterilmiyor:", {
              sender: message.sender,
              username,
            });
            return;
          }

          // Bildirimi ekleme ve işleme
          console.log("Bildirim gösteriliyor:", message);
          
          // Gelen bildirimi bildirimlere ekle
          setNotifications((prev) => [message, ...prev].slice(0, 50));

          // Bildirim tipine göre işlem yap
          switch (message.notification_type) {
            case "mention":
              // Bahsedilme durumunu ayarla
              setHasMentions(true);
              
              // Bildirim sesi çal
              playNotificationSound("mention", message.sender, message.room);
              
              // Masaüstü bildirimi göster
              showDesktopNotification(
                "Senden bahsedildi",
                message.content
              );
              break;

            case "unread_message":
              // Bildirim sesi çal
              playNotificationSound("message", message.sender, message.room);
              
              // Masaüstü bildirimi göster
              showDesktopNotification(
                `Yeni Mesaj: ${message.room || ""}`,
                message.content
              );
              break;

            case "new_room":
              showInfoToast("Yeni Oda", message.content);
              break;

            case "profile_update":
              showInfoToast("Profil Güncellemesi", message.content);
              break;
          }
        } catch (error) {
          console.error("notification handler hata:", error);
        }
      },

      // Bildirim geçmişi
      notification_history: () => {
        if (Array.isArray(message.notifications)) {
          // Bildirimleri her durumda güncelle
          setNotifications(message.notifications);

          // Rahatsız Etme modu değerini tam boolean karşılaştırma ile kontrol et
          console.log("notification_history handler - doNotDisturb değeri:", doNotDisturb, "typeof:", typeof doNotDisturb);
          
          // Bahsedilme durumunu kontrol et - Rahatsız Etme modu aktif değilse
          if (doNotDisturb !== true) {
            const hasMention = message.notifications.some(
              (notif) => notif.notification_type === "mention",
            );
            setHasMentions(hasMention);
          } else {
            // Rahatsız Etme modunda bahsedilme durumunu sıfırla
            setHasMentions(false);
            console.log("Rahatsız Etme modu aktif, bahsedilme durumu sıfırlandı");
          }
        }
      },

      // Okunmamış mesajlar
      unread_messages: () => {
        // Rahatsız Etme modu değerini tam boolean karşılaştırma ile kontrol et
        console.log("unread_messages handler - doNotDisturb değeri:", doNotDisturb, "typeof:", typeof doNotDisturb);
        
        // Rahatsız Etme modu aktifse, okunmamış mesajları işleme
        if (doNotDisturb === true) {
          console.log("Rahatsız Etme modu aktif, okunmamış mesajlar güncellenmedi");
          return;
        }
        
        if (message.unread && typeof message.unread === "object") {
          // Mevcut odada olduğumuz için o odadaki mesajları okundu olarak işaretle
          const updatedUnread = { ...message.unread };
          if (currentRoom && currentRoom in updatedUnread) {
            updatedUnread[currentRoom] = 0;
          }
          setUnreadMessages(updatedUnread);
          
          // Toplam sayacı da güncelle
          updateTotalUnreadCount();
        }
      },

      // Bildirimler temizlendi
      notifications_cleared: () => {
        setNotifications([]);
        setHasMentions(false);
      },

      // Genel hata mesajı
      error: () => {
        console.error("Sunucu hatası:", message.msg);
        showErrorToast(
          "Sunucu Hatası",
          message.msg || "Bilinmeyen bir hata oluştu.",
        );
      },

      // Oda şifresi hatası
      room_password_error: () => {
        console.error("Şifre hatası:", message.msg);
        showErrorToast(
          "Şifre Yanlış",
          message.msg || "Girdiğiniz şifre yanlış. Lütfen tekrar deneyin.",
        );
      },

      // Kimlik doğrulama hatası
      auth_error: () => {
        console.error("Kimlik doğrulama hatası:", message.msg);
        showErrorToast(
          "Kimlik Doğrulama Hatası",
          message.msg || "Kimlik doğrulama başarısız oldu.",
        );
        handleDisconnect();
      },

      // Bilinmeyen mesaj tipi
      unknown: () => {
        console.log("Bilinmeyen mesaj tipi:", message);
        // Eğer mesajda room bilgisi varsa ve bilinmeyen bir mesaj tipiyse
        // bu muhtemelen oda değişimi bilgisidir
        if (message.room && typeof message.room === "string") {
          setCurrentRoom(message.room);
        }
      },
    };

    // Mesaj tipine göre işleyiciyi çağır
    try {
      const handler = messageHandlers[messageType] || messageHandlers.unknown;
      handler();
    } catch (error) {
      console.error("Mesaj işlenirken hata:", error);
    }
  };

  // Bildirim işlemleri
  const markRoomAsRead = async (room) => {
    try {
      if (!room || !isConnected) return;

      const messageObj = {
        type: "mark_as_read",
        room: room,
      };

      const response = await window.chatAPI.sendMessage(
        JSON.stringify(messageObj),
      );

      if (!response.success) {
        console.error("Okundu olarak işaretleme hatası:", response.error);
      }
    } catch (error) {
      console.error("Okundu olarak işaretleme hatası:", error);
    }
  };

  // Tüm bildirimleri temizle
  const clearAllNotifications = async () => {
    try {
      if (!isConnected) return;

      const messageObj = {
        type: "clear_notifications",
      };

      const response = await window.chatAPI.sendMessage(
        JSON.stringify(messageObj),
      );

      if (response.success) {
        setNotifications([]);
        setHasMentions(false);
      } else {
        console.error("Bildirim temizleme hatası:", response.error);
      }
    } catch (error) {
      console.error("Bildirim temizleme hatası:", error);
    }
  };

  // Toplam okunmamış mesaj sayısını hesapla
  useEffect(() => {
    // Tüm odaların toplam okunmamış mesaj sayısını hesapla
    const total = Object.values(unreadMessages).reduce(
      (sum, count) => sum + count,
      0,
    );
    setTotalUnreadCount(total);

    // Doküman başlığını güncelle
    if (total > 0) {
      document.title = `(${total}) KenuCord`;
    } else {
      document.title = "KenuCord";
    }
  }, [unreadMessages]);

  // Oda değiştiğinde otomatik olarak o odayı okundu olarak işaretle
  useEffect(() => {
    if (isConnected && currentRoom) {
      // Oda değişimi sonrası kısa bir gecikmeyle okundu olarak işaretle
      // Bu, bildirim gönderme/alma sürecinin tamamlanmasını bekler
      setTimeout(() => {
        markRoomAsRead(currentRoom);

        // Yerel olarak da okunmamış mesajları sıfırla
        setUnreadMessages((prev) => ({
          ...prev,
          [currentRoom]: 0,
        }));
      }, 300);
    }
  }, [currentRoom, isConnected]);

  // Bağlantı kesilince çalışacak
  const handleDisconnect = () => {
    setIsConnected(false);
    setMessages([]);
    setUsers([]);
    setRooms(["lobby"]);
    setCurrentRoom("lobby");

    // Bildirim state'lerini sıfırla
    setNotifications([]);
    setUnreadMessages({});
    setTotalUnreadCount(0);
    setHasMentions(false);

    window.chatAPI.removeAllListeners();
  };

  // Component unmount olurken bağlantıyı temizle
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected]); // Added isConnected as dependency

  // Ses efekti çal
  const playNotificationSound = (type, sender = null, room = null) => {
    try {
      // Önce Rahatsız Etme modunu kontrol et (tam boolean karşılaştırma)
      if (doNotDisturb === true) {
        console.log("playNotificationSound - Rahatsız Etme modu aktif, bildirim sesi çalınmıyor");
        return;
      }

      // KRİTİK: Önce kesinlikle kendi mesajlarımız için kontrol et
      if (sender && username && sender === username) {
        console.log("Kendi mesajımız için ses çalınmıyor:", {
          sender,
          username,
        });
        return;
      }

      // Diğer bildirim koşullarını kontrol et - şu anda aktif odada mıyız?
      if (sender && room && room === currentRoom) {
        console.log("Mevcut odada olduğumuz için ses çalınmıyor:", {
          room,
          currentRoom,
        });
        return;
      }

      console.log(`Bildirim sesi çalınıyor (${type})...`);

      // Electron preload API kullanarak ses çal
      if (window.chatAPI && window.chatAPI.playSound) {
        window.chatAPI
          .playSound("/sounds/notification.mp3")
          .then((success) => {
            if (!success) {
              console.error("Ses çalma başarısız oldu");
              // Yedek olarak tarayıcı API'si ile tekrar dene
              try {
                // Doğrudan browser Audio API ile çalmayı dene
                const notificationSound = new Audio(window.location.origin + "/sounds/notification.mp3");
                notificationSound.volume = 0.5;
                notificationSound.play().catch((e) => {
                  console.error("Tarayıcı ses çalma hatası:", e);
                });
              } catch (e) {
                console.error("Tarayıcı ses yükleme hatası:", e);
              }
            }
          })
          .catch((err) => {
            console.error("Ses çalma hatası:", err);
            // Hata durumunda yedek metodu kullan
            try {
              const notificationSound = new Audio(window.location.origin + "/sounds/notification.mp3");
              notificationSound.volume = 0.5;
              notificationSound.play().catch((e) => {
                console.error("Tarayıcı ses çalma hatası:", e);
              });
            } catch (e) {
              console.error("Tarayıcı ses yükleme hatası:", e);
            }
          });
      } else {
        // Yedek olarak tarayıcı API'si
        try {
          const notificationSound = new Audio(window.location.origin + "/sounds/notification.mp3");
          notificationSound.volume = 0.5;
          notificationSound.play().catch((e) => {
            console.error("Tarayıcı ses çalma hatası:", e);
          });
        } catch (e) {
          console.error("Tarayıcı ses yükleme hatası:", e);
        }
      }
    } catch (error) {
      console.error("Bildirim sesi çalınamadı:", error);
    }
  };

  // Bildirim sistemi başlatma ve durumu izleme
  useEffect(() => {
    // Rahatsız Etme modu ayarlarını yükle
    loadDoNotDisturbSettings();
    
    console.log("Bildirim sistemi useEffect - doNotDisturb durumu:", doNotDisturb, "typeof:", typeof doNotDisturb);
    
    // Sayfa görünürlük durumunu izle
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Sayfa görünür olduğunda ve Rahatsız Etme modu kapalıysa bildirimleri temizle
        if (isConnected && currentRoom && doNotDisturb !== true) {
          console.log("Sayfa görünür, bildirimler temizleniyor");
          markRoomAsRead(currentRoom);
        }
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isConnected, currentRoom, doNotDisturb]);

  // Masaüstü bildirimleri için izin iste
  useEffect(() => {
    // Bildirim sisteminin kullanılabilirliğini kontrol et
    const initializeNotifications = async () => {
      try {
        console.log("Bildirim sistemi başlatılıyor...");

        if (!("Notification" in window)) {
          console.log("Bu tarayıcı masaüstü bildirimlerini desteklemiyor.");
          return;
        }

        // Bildirim izni kontrol et veya iste
        if (Notification.permission === "default") {
          console.log("Bildirim izni isteniyor...");
          const permission = await Notification.requestPermission();
          console.log(`Bildirim izni sonucu: ${permission}`);
        } else {
          console.log(`Mevcut bildirim izni: ${Notification.permission}`);
        }
      } catch (error) {
        console.error("Bildirim sistemi başlatılırken hata:", error);
      }
    };

    // Bildirim sistemini başlat
    initializeNotifications();
  }, []);

  return (
    <ChatContext.Provider
      value={{
        isConnected,
        username,
        messages,
        users,
        rooms,
        currentRoom,
        connect,
        disconnect,
        sendMessage,
        switchRoom,
        createRoom,
        getRooms,
        
        // Bildirim sistemi
        notifications,
        unreadMessages,
        totalUnreadCount,
        hasMentions,
        markRoomAsRead,
        clearAllNotifications,
        
        // Rahatsız Etme modu
        doNotDisturb,
        doNotDisturbUntil,
        toggleDoNotDisturb,
        enableDoNotDisturbFor,
        
        // Yazıyor göstergesi
        typingUsers,
        handleTyping
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  return useContext(ChatContext);
}
