const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const net = require('net');
const isDev = require('electron-is-dev');
const { parse } = require('url');
const fs = require('fs');

// Ayarlar için dosya yolu
let settingsPath;

// Varsayılan ayarlar
const DEFAULT_SETTINGS = {
  theme: 'light',
  lastConnection: {
    host: '',
    port: '',
    username: ''
  },
  notifications: true
};

// Ayarları oku
function readSettings() {
  try {
    if (settingsPath && fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(data);
      
      // Ayarları varsayılan şema ile birleştir
      return { ...DEFAULT_SETTINGS, ...settings };
    }
  } catch (error) {
    console.error('Ayarlar okunurken hata:', error);
    
    // Hata durumunda yedek ayarlar dosyası var mı kontrol et
    try {
      const backupPath = `${settingsPath}.backup`;
      if (fs.existsSync(backupPath)) {
        console.log('Ayarlar yedekten geri yükleniyor...');
        const backupData = fs.readFileSync(backupPath, 'utf8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(backupData) };
      }
    } catch (backupError) {
      console.error('Yedek ayarlar okunurken hata:', backupError);
    }
  }
  
  return DEFAULT_SETTINGS; // Varsayılan ayarlar
}

// Ayarları kaydet
function saveSettings(settings) {
  try {
    if (!settingsPath) {
      return false;
    }
    
    // Ayarları doğrula
    if (typeof settings !== 'object') {
      console.error('Geçersiz ayarlar formatı:', settings);
      return false;
    }
    
    // Mevcut ayarları oku ve birleştir
    const currentSettings = readSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    
    // Yedek al (mevcut dosya varsa)
    if (fs.existsSync(settingsPath)) {
      try {
        fs.copyFileSync(settingsPath, `${settingsPath}.backup`);
      } catch (backupError) {
        console.error('Ayarlar yedeklenirken hata:', backupError);
      }
    }
    
    // Yeni ayarları kaydet
    const settingsJson = JSON.stringify(updatedSettings, null, 2);
    fs.writeFileSync(settingsPath, settingsJson);
    return true;
  } catch (error) {
    console.error('Ayarlar kaydedilirken hata:', error);
    return false;
  }
}

// Global durumlar
let mainWindow;
let socketClient;

// TCP istemcisi
function createTCPClient() {
  return new net.Socket();
}

function createWindow() {
  // Ayarlar dosyası yolunu ayarla
  settingsPath = path.join(app.getPath('userData'), 'settings.json');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'renderer/public/icon.png'),
    title: 'KenuCord v1.0.0',
  });

  const url = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, './renderer/out/index.html')}`;

  mainWindow.loadURL(url);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    if (socketClient && !socketClient.destroyed) {
      socketClient.destroy();
    }
    mainWindow = null;
  });
}

// TCP bağlantısı kurma işlemi - Hata yönetimi iyileştirildi
function connectToServer(host, port, username, password) {
  return new Promise((resolve, reject) => {
    try {
      // Eğer zaten bağlı bir socket varsa, önce onu temizleyelim
      if (socketClient && !socketClient.destroyed) {
        socketClient.destroy();
      }
      
      socketClient = createTCPClient();
      
      // Bağlantı zaman aşımı
      const connectionTimeout = setTimeout(() => {
        if (socketClient) {
          socketClient.destroy();
          reject(new Error('Bağlantı zaman aşımına uğradı. Sunucu yanıt vermiyor.'));
        }
      }, 10000); // 10 saniye
      
      socketClient.on('connect', () => {
        clearTimeout(connectionTimeout);
        
        // Kimlik doğrulama verilerini gönder
        try {
          const data = JSON.stringify({ username, password });
          socketClient.write(data);
          console.log('Authentication data sent:', { username, password: '****' });
        } catch (error) {
          console.error('Kimlik doğrulama verisi gönderilirken hata:', error);
          socketClient.destroy();
          reject(new Error('Kimlik doğrulama verisi gönderilemedi: ' + error.message));
        }
      });

      socketClient.on('error', (err) => {
        clearTimeout(connectionTimeout);
        console.error('Socket connection error:', err);
        
        // Kullanıcı dostu hata mesajları
        if (err.code === 'ECONNREFUSED') {
          reject(new Error('Bağlantı reddedildi. Sunucu çalışmıyor olabilir veya port yanlış.'));
        } else if (err.code === 'ETIMEDOUT') {
          reject(new Error('Bağlantı zaman aşımına uğradı. Sunucu yanıt vermiyor.'));
        } else if (err.code === 'ENOTFOUND') {
          reject(new Error('Sunucu adresi bulunamadı. Adresi kontrol edin.'));
        } else {
          reject(err);
        }
      });

      let buffer = '';
      
      // JSON mesaj işleme fonksiyonu - kodun tekrarlanmasını önlemek için ayrıldı
      const processJSONMessage = (jsonStr) => {
        try {
          const parsedMessage = JSON.parse(jsonStr);
          console.log('Parsed message:', parsedMessage);
          
          // Kimlik doğrulama hatası kontrolü
          if (parsedMessage.type === 'auth_error') {
            console.error('Authentication error:', parsedMessage.msg);
            socketClient.destroy();
            return reject(new Error(parsedMessage.msg));
          }
          
          // Başarılı kimlik doğrulama kontrolü
          if (parsedMessage.type === 'message' && parsedMessage.msg.includes('katıldı')) {
            resolve(true);
          }
          
          // Mesajı renderer sürecine ilet
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('message-received', parsedMessage);
          }
          
          return true;
        } catch (err) {
          console.error('JSON parsing error:', err, 'JSON String:', jsonStr);
          return false;
        }
      };
      
      socketClient.on('data', (data) => {
        buffer += data.toString(); // Gelen veriyi buffer'a ekle
        
        // JSON nesnelerini ayır ve işle
        let boundaryIndex;
        while ((boundaryIndex = buffer.indexOf('}{')) !== -1) {
          const chunk = buffer.slice(0, boundaryIndex + 1); // İlk JSON nesnesini al
          buffer = buffer.slice(boundaryIndex + 1); // Geri kalan veriyi buffer'da bırak
          
          processJSONMessage(chunk);
        }
        
        // Son JSON nesnesini işlemeyi dene
        try {
          if (buffer.trim()) {
            // JSON olarak ayrıştırılabilir mi kontrol et
            JSON.parse(buffer);
            
            // Ayrıştırılabilirse işle ve buffer'ı temizle
            if (processJSONMessage(buffer)) {
              buffer = '';
            }
          }
        } catch (err) {
          // Eksik JSON verisi olabilir, bir sonraki veri parçasını bekle
          // console.log('Incomplete JSON data, waiting for more...', buffer);
        }
      });

      socketClient.on('close', () => {
        console.log('Connection closed');
        mainWindow.webContents.send('connection-closed');
      });

      socketClient.connect(port, host);
    } catch (error) {
      console.error('Error in connect function:', error);
      reject(error);
    }
  });
}

// IPC olayları için hata işleme yardımcısı
const safeIPCHandler = (handler) => {
  return async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      console.error(`IPC handler error: ${error.message}`, error);
      return { success: false, error: error.message };
    }
  };
};

// IPC olayları (Renderer ile ana süreç arasındaki iletişim)
ipcMain.handle('connect-to-server', safeIPCHandler(async (_, { host, port, username, password }) => {
  if (!host || !port) {
    throw new Error('Sunucu adresi ve port gereklidir');
  }
  
  if (!username) {
    throw new Error('Kullanıcı adı gereklidir');
  }
  
  // Sunucuya bağlan
  await connectToServer(host, port, username, password);
  return { success: true };
}));

ipcMain.handle('send-message', safeIPCHandler(async (_, message) => {
  if (!socketClient || socketClient.destroyed) {
    throw new Error('Bağlantı yok');
  }
  
  // Mesajın geçerli JSON olduğundan emin ol
  try {
    if (typeof message === 'string') {
      JSON.parse(message);
    }
  } catch (error) {
    throw new Error('Geçersiz mesaj formatı');
  }
  
  socketClient.write(message);
  return { success: true };
}));

ipcMain.handle('disconnect', safeIPCHandler(async (_) => {
  if (!socketClient || socketClient.destroyed) {
    return { success: false, error: 'Zaten bağlantı kesildi' };
  }
  
  socketClient.destroy();
  return { success: true };
}));

// Masaüstü bildirimleri için IPC handler
ipcMain.handle('show-notification', safeIPCHandler(async (_, options) => {
  try {
    if (!options || !options.title) {
      throw new Error('Bildirim başlığı gereklidir');
    }
    
    // Electron Notification API'sini kullan
    const { Notification } = require('electron');
    
    const notification = new Notification({
      title: options.title,
      body: options.body || '',
      icon: options.icon || path.join(__dirname, 'renderer/public/icon.png'),
      silent: options.silent || false,
      timeoutType: 'default'
    });
    
    // Bildirime tıklanma olayını dinle
    notification.on('click', () => {
      // Eğer oda değişimi isteniyorsa
      if (options.clickAction === 'switchRoom' && options.room && mainWindow) {
        mainWindow.show(); // Pencereyi göster
        mainWindow.focus(); // Pencereye odaklan
        
        // Odaya geçiş yapmak için renderer'a mesaj gönder
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('notification-clicked', {
            action: 'switchRoom',
            room: options.room
          });
        }
      }
    });
    
    // Bildirimi göster
    notification.show();
    
    return { success: true };
  } catch (error) {
    console.error('Bildirim gösterme hatası:', error);
    return { success: false, error: error.message };
  }
}));

// Ses dosyası yolunu doğru bir şekilde oluşturmak için yardımcı fonksiyon
function getAssetPath(assetName) {
  return path.join(__dirname, 'renderer/public', assetName).replace(/\\/g, '/');
}

// Tema tercihi için IPC olayları
ipcMain.handle('get-theme-preference', safeIPCHandler(async () => {
  const settings = readSettings();
  return settings.theme || 'light'; // Varsayılan olarak aydınlık tema
}));

ipcMain.handle('set-theme-preference', safeIPCHandler(async (_, theme) => {
  if (!theme || (theme !== 'light' && theme !== 'dark')) {
    throw new Error('Geçersiz tema değeri');
  }
  
  const settings = readSettings();
  settings.theme = theme;
  const saved = saveSettings(settings);
  
  if (!saved) {
    throw new Error('Tema tercihi kaydedilemedi');
  }
  
  return { success: true };
}));

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});