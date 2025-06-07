const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chatAPI', {
  connectToServer: (config) => ipcRenderer.invoke('connect-to-server', config),
  sendMessage: (message) => ipcRenderer.invoke('send-message', message),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  onMessageReceived: (callback) => {
    ipcRenderer.on('message-received', (_, message) => callback(message));
  },
  onConnectionClosed: (callback) => {
    ipcRenderer.on('connection-closed', () => callback());
  },
  onNotificationClicked: (callback) => {
    ipcRenderer.on('notification-clicked', (_, data) => callback(data));
  },
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('message-received');
    ipcRenderer.removeAllListeners('connection-closed');
    ipcRenderer.removeAllListeners('notification-clicked');
  },
  removeNotificationListener: () => {
    ipcRenderer.removeAllListeners('notification-clicked');
  },
  // Tema yönetimi için API'ler
  getThemePreference: () => ipcRenderer.invoke('get-theme-preference'),
  setThemePreference: (theme) => ipcRenderer.invoke('set-theme-preference', theme),
  
  // Masaüstü bildirimleri için API
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // Ses çalma için API
  playSound: (soundPath) => {
    try {
      // Electron ortamında doğru yol ile ses çalma
      // Tam URL oluştur - window.location.origin ile başlıyorsa zaten tam URL
      const fullPath = soundPath.startsWith('http') 
        ? soundPath 
        : window.location.origin + soundPath;
        
      console.log('Ses dosyası çalınıyor:', fullPath);
      
      const audio = new Audio(fullPath);
      audio.volume = 0.5;
      
      // Ses çalmayı başlat
      const playPromise = audio.play();
      
      if (playPromise) {
        return playPromise
          .then(() => {
            console.log('Ses başarıyla çalındı');
            return true; // Başarı durumunda true dön
          })
          .catch(e => {
            console.error('Ses çalma hatası:', e);
            return false;
          });
      }
      return Promise.resolve(true); // Promise olmayan durumda bile Promise dön
    } catch (error) {
      console.error('Ses çalma API hatası:', error);
      return Promise.resolve(false); // Hata durumunda Promise içinde false dön
    }
  }
});