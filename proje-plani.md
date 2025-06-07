# KenuCord Mesajlaşma Uygulaması - Proje Planı

## Proje Genel Bakış
KenuCord, Electron ve Next.js kullanılarak geliştirilmiş bir mesajlaşma uygulamasıdır. Uygulama bir TCP sunucusuna bağlanarak kullanıcıların sohbet etmesine olanak tanır.

## Proje Yapısı
- **Electron Ana Süreci**: main.js ve preload.js
- **Next.js Web Arayüzü**: renderer/ dizini altında
- **Bileşenler**: Giriş formu, sohbet alanı, oda listesi ve kullanıcı listesi
- **Context API**: Uygulama durumu ve veri yönetimi için

## Tamamlanan Özellikler
- [x] Temel Electron uygulaması kurulumu
- [x] Next.js entegrasyonu
- [x] TCP Soket bağlantısı
- [x] Kullanıcı kimlik doğrulama (şifre desteği ile)
- [x] Temel sohbet arayüzü
- [x] Mesaj gönderme ve alma
- [x] Oda listesi görüntüleme
- [x] Oda değiştirme ve oluşturma
- [x] Şifreli odalara giriş
- [x] Kullanıcı listesi görüntüleme
- [x] Tema değiştirme özelliği (açık/koyu tema)
- [x] Kullanıcı arayüzü (UI) tasarımı (Chakra UI ile)
- [x] Ayarları kaydetme ve yükleme
- [x] Bildirim sistemi
- [x] Profil fotoğrafı güncellemesi


## Yapılacaklar
- [ ] Yazıyor göstergesi
- [ ] Sesli ve görüntülü arama entegrasyonu
- [ ] Mesaj düzenleme ve silme özellikleri
- [ ] Emoji ve GIF desteği
- [ ] Özel mesajlaşma (DM) özelliği
- [ ] Kullanıcı ayarları paneli
- [ ] Yazı tipi ve boyutu ayarları
- [ ] Güvenlik iyileştirmeleri (end-to-end şifreleme)
- [ ] Otomatik güncelleme sistemi

## Teknik Borç
- [x] Mesaj işleme mantığının iyileştirilmesi
- [x] JSON ayrıştırma mantığının daha sağlam hale getirilmesi
- [x] Hata işleme mekanizmalarının geliştirilmesi
- [x] Kod tekrarlarının azaltılması

### Yapılan İyileştirmeler
1. **JSON Ayrıştırma İyileştirilmesi**: 
   - main.js'de JSON mesaj işleme mantığı tek bir fonksiyona alınarak kod tekrarı azaltıldı
   - Eksik/bozuk JSON verisi için daha sağlam kontroller eklendi

2. **Hata Yönetimi İyileştirmeleri**:
   - TCP bağlantı kurma işleminde kapsamlı hata yönetimi eklendi
   - Bağlantı zaman aşımı kontrolü eklendi
   - Kullanıcı dostu hata mesajları eklendi
   - IPC olayları için genel bir hata işleme mekanizması oluşturuldu (safeIPCHandler)

3. **Ayarlar Yönetimi**:
   - Varsayılan ayarlar tanımlandı
   - Ayarlar için yedekleme mekanizması eklendi
   - Ayarlar doğrulama sistemi geliştirildi

4. **Mesaj İşleme İyileştirmeleri**:
   - Mesaj işleme mantığı switch-case'den obje bazlı işleyicilere dönüştürüldü
   - Kod tekrarı azaltıldı ve okunabilirlik arttırıldı
   - Hata ve bilgi mesajları için yardımcı fonksiyonlar eklendi
   - Tip kontrolleri geliştirildi

5. **Bağlantı Kurma Güvenliği**:
   - Kullanıcı girdileri için kapsamlı doğrulama eklendi
   - Bağlantı parametrelerinin işlenmesi iyileştirildi
   - Bağlantı durumu bildirimleri eklendi

## Kullanılan Teknolojiler
- Electron
- Next.js
- React
- Chakra UI
- TCP Soketleri

## Geliştirme Ortamı
Geliştirme ortamını başlatmak için:
```
npm run dev
```

Bu komut, Next.js geliştirme sunucusunu ve Electron uygulamasını eşzamanlı olarak başlatır.

## Dağıtım
Uygulamayı paketlemek için:
```
npm run package
```

Bu komut, uygulamayı Windows, macOS ve Linux platformları için paketler. 