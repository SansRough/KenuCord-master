import '../styles/globals.css';
import { ChakraProvider, extendTheme, useColorMode, useColorModeValue } from '@chakra-ui/react';
import { createContext, useContext, useEffect, useState } from 'react';
import { ChatProvider } from '../context/ChatContext';

const theme = extendTheme({
  colors: {
    brand: {
      50: '#E6F6FF',
      100: '#B3E0FF',
      500: '#0078D7',
      600: '#0063B1',
      700: '#004E8C',
    },
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.50',
        color: props.colorMode === 'dark' ? 'white' : 'black',
      }
    })
  },
  // Koyu tema renkleri
  semanticTokens: {
    colors: {
      'bg-app': {
        default: 'gray.50',
        _dark: 'gray.800',
      },
      'bg-sidebar': {
        default: 'white',
        _dark: 'gray.700',
      },
      'bg-chat': {
        default: 'white',
        _dark: 'gray.700',
      },
      'bg-message': {
        default: 'white',
        _dark: 'gray.600',
      },
      'bg-system-message': {
        default: 'gray.100',
        _dark: 'gray.500',
      },
      'border-color': {
        default: 'gray.200',
        _dark: 'gray.600',
      },
      'text-primary': {
        default: 'black',
        _dark: 'white',
      },
      'text-secondary': {
        default: 'gray.500',
        _dark: 'gray.300',
      },
    }
  }
});

// Tema tercihi için context oluşturma
const ThemeContext = createContext();

function ThemeProvider({ children }) {
  const { colorMode, toggleColorMode, setColorMode } = useColorMode();
  const [isDark, setIsDark] = useState(colorMode === 'dark');

  // Sayfa yüklendiğinde tema tercihini al
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        // Önce electron store'dan tercihi almaya çalış
        if (window.chatAPI && window.chatAPI.getThemePreference) {
          const savedTheme = await window.chatAPI.getThemePreference();
          if (savedTheme) {
            setColorMode(savedTheme);
            setIsDark(savedTheme === 'dark');
            return;
          }
        }

        // Electron store yoksa veya başarısız olursa localStorage'a bak
        const localTheme = localStorage.getItem('kenucord-theme');
        if (localTheme) {
          setColorMode(localTheme);
          setIsDark(localTheme === 'dark');
        }
      } catch (error) {
        console.error('Tema tercihi yüklenirken hata:', error);
      }
    };

    loadThemePreference();
  }, []);

  // Tema değiştiğinde kaydet
  const saveThemePreference = async (newTheme) => {
    try {
      // Hem electron store'a hem de localStorage'a kaydet
      if (window.chatAPI && window.chatAPI.setThemePreference) {
        await window.chatAPI.setThemePreference(newTheme);
      }
      localStorage.setItem('kenucord-theme', newTheme);
    } catch (error) {
      console.error('Tema tercihi kaydedilirken hata:', error);
    }
  };

  // Tema değiştirme işleyicisi
  const handleToggleTheme = () => {
    const newTheme = colorMode === 'light' ? 'dark' : 'light';
    toggleColorMode();
    saveThemePreference(newTheme);
  };

  // colorMode değişince isDark'ı güncelle
  useEffect(() => {
    setIsDark(colorMode === 'dark');
  }, [colorMode]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: handleToggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider theme={theme}>
      <ThemeProvider>
        <ChatProvider>
          <Component {...pageProps} />
        </ChatProvider>
      </ThemeProvider>
    </ChakraProvider>
  );
}

export default MyApp;