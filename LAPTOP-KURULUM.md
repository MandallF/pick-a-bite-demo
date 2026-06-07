# 💻 Laptopta Çalıştırma — Adım Adım (Sunum İçin)

Bu rehber, projeyi **sıfır kurulu yeni bir Windows laptopta** baştan çalıştırmak içindir.
Adımları sırayla takip et. Toplam süre: ilk seferde ~15-20 dk (çoğu indirme/bekleme).

> **Özet akış:** Programları kur → Repoyu indir → `.env` doldur → `npm install` →
> `demo-baslat.bat` çift tıkla → telefonda QR tara. Bitti.

---

## 0) Telefon ve Laptop AYNI WiFi'da olmalı

Uygulama telefonda çalışır, sunucu laptopta. İkisi birbirini görebilmeli.

- **En garantili yöntem:** Telefonun **kişisel hotspot**'unu aç, laptopu ona bağla.
  (Okul/kampüs WiFi'ları cihazlar arası bağlantıyı engelleyebilir — hotspot bunu çözer.)
- Aynı ev/ofis WiFi'ı da olur.

---

## 1) Gerekli Programları Kur (bir kez)

PowerShell veya CMD aç, şunları sırayla çalıştır. (Zaten kuruluysa atla.)

```powershell
winget install Git.Git
winget install Microsoft.OpenJDK.17
winget install OpenJS.NodeJS
winget install Cloudflare.cloudflared
```

> Kurulumdan sonra **terminali kapatıp yeniden aç** (PATH güncellensin).

**Kontrol et** (her biri sürüm numarası yazmalı):

```powershell
git --version
java -version          # "17" görmelisin
node -v                # v18+ olmalı
cloudflared --version
```

- **Telefon:** Play Store / App Store'dan **"Expo Go"** uygulamasını kur.
- (Opsiyonel) QR'ın PNG olarak açılması için Python + qrcode: `winget install Python.Python.3.12` sonra `pip install qrcode`. Kurmasan da olur — Expo penceresinde zaten QR çıkar.

---

## 2) Projeyi İndir

İstediğin klasöre git (ör. Masaüstü) ve klonla:

```powershell
git clone https://github.com/MandallF/pick-a-bite-demo.git
cd pick-a-bite-demo
```

---

## 3) API Anahtarlarını Gir (`.env`)

`pick-a-bite-main` klasöründe **`.env`** adında bir dosya oluştur.
En kolayı: yanındaki `.env.example` dosyasını kopyalayıp adını `.env` yap, sonra
anahtarları doldur.

PowerShell ile hızlı kopyalama:

```powershell
Copy-Item pick-a-bite-main\.env.example pick-a-bite-main\.env
```

Sonra `pick-a-bite-main\.env` dosyasını Not Defteri ile aç ve **Kubilay'ın
verdiği gerçek anahtarları** yapıştır. İçeriği şöyle olmalı:

```env
EXPO_PUBLIC_GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
EXPO_PUBLIC_GEMINI_API_KEY=xxxxxxxxxxxxxxxx
GEMINI_API_KEY=xxxxxxxxxxxxxxxx
EXPO_PUBLIC_BACKEND_URL=http://localhost:8080/pick-a-bite
```

> `EXPO_PUBLIC_BACKEND_URL` satırına dokunma — `demo-baslat.bat` onu otomatik
> Cloudflare adresiyle günceller.

---

## 4) Frontend Bağımlılıklarını Kur (bir kez)

```powershell
cd pick-a-bite-main
npm install
cd ..
```

> Birkaç dakika sürebilir. "high severity" uyarıları normaldir, görmezden gel.

---

## 5) TEK TIK BAŞLAT

Proje kök klasöründeki **`demo-baslat.bat`** dosyasına **çift tıkla**.

Bu dosya sırasıyla şunları otomatik yapar:
1. Eski servisleri kapatır
2. **Backend**'i başlatır (ilk sefer Maven indireceği için ~2-4 dk sürebilir, sabret)
3. **Cloudflare tunnel** açar (backend'i internete açar)
4. `.env`'i tunnel adresiyle **otomatik günceller**
5. **Expo**'yu LAN modunda başlatır
6. **QR kodu** ekranda açar

Pencerede **"DEMO HAZIR"** yazısını görene kadar bekle.

> ⚠️ **Açılan siyah pencereleri KAPATMA.** Onlar kapanırsa servisler durur.

---

## 6) Telefonda Aç

1. Telefon ile laptop **aynı WiFi/hotspot**'ta olsun (Adım 0).
2. Telefonda **Expo Go**'yu aç → **"Scan QR code"**.
3. Ekranda açılan **`expo-qr.png`** kodunu (veya Expo penceresindeki QR'ı) tara.
4. Uygulama telefonda yüklenir (~30 sn). Açıldı! 🎉

---

## 7) Demo Sırası (Sunum Akışı)

1. **Harita** — Bursa'daki 4 restoran pin olarak görünür.
2. **Profil → Beslenme Tercihleri** — örn. *Vegan*'ı aç → **"Tercihleri Kaydet"** →
   haritaya dönünce pinler renklenir (uygun = yeşil, uygun değil = kırmızı).
3. **Restoran** — bir pine dokun → menü (fiyat, kalori, alerjen).
4. **QR Tara** — alt buton → kamera → masadaki QR → ilgili menü.
5. **Chatbot** — örn. *"300 TL altı tavuklu yemek öner"* → AI restoranları
   gruplayıp önerir, "Haritada gör" ile haritaya atar.

---

## 🩹 Bir Şey Çalışmazsa

| Sorun | Çözüm |
|-------|-------|
| **Telefon uygulamayı açamıyor / QR çalışmıyor** | Telefon ve laptop aynı ağda mı? **Telefon hotspot'u** kullan (en garantili). |
| **Haritada hiç restoran yok** | Veritabanı repoda hazır gelir, normalde olmaz. Olduysa: backend açıkken yeni terminalde `cd pick-a-bite-main` → `node populate.js`. |
| **Backend açılmıyor / "240 saniyede hazır olmadı"** | `java -version` 17 mi? İlk sefer Maven indiriyordur, internet açık mı? Pencereyi kapatıp `demo-baslat.bat`'ı tekrar çalıştır. |
| **Chatbot "menü bilgisi yok" diyor** | `.env`'de Groq anahtarı doğru mu? Backend pencereleri açık mı? |
| **`localhost:8081` tarayıcıda hata** | Normal — harita kütüphanesi web'i desteklemez, sadece telefonda çalışır. |
| **Türkçe harfler bozuk (Ä±)** | `demo-baslat.bat`'ı kapatıp tekrar çalıştır. |

**Her şeyi durdurmak için** (yeni terminal):
```powershell
taskkill /F /IM cloudflared.exe /IM java.exe /IM node.exe
```

---

## 🔑 Sunumdan Sonra (Güvenlik)

Demo bitince paylaşılan API anahtarlarını **iptal et** (yenisini almak ücretsiz):
- Groq: https://console.groq.com/keys
- Gemini: https://aistudio.google.com/apikey
