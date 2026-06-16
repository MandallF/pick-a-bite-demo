# Pick A Bite

> Yapay zekâ destekli, konum tabanlı **menü öneri sistemi** — Bursa Teknik Üniversitesi BLM0324 Yazılım Mühendisliği proje ödevi.

Pick A Bite, restoranda **"ne yiyeceğim?"** sorusunu çözen bir karar destek uygulamasıdır. Kullanıcılar QR kod ile menülere erişir, bütçe/alerjen/beslenme tercihlerini tanımlar ve **Groq (Llama 3.3 70B)** destekli sohbet asistanından doğal dilde öneri alır.

```
"250 TL altında glütensiz bir öğün öner"
        ↓
  Yapay zekâ menüyü tarar → en uygun seçenekleri sunar
```

---

## Demo Video

Ürünü tanıtan ve kullanımını gösteren 5 dakikalık video:

**https://youtu.be/Z5ILXRLEks4**

---

## İçindekiler

- [Özellikler](#özellikler)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Proje Yapısı](#proje-yapısı)
- [Hızlı Başlangıç (Tek Tık)](#hızlı-başlangıç-tek-tık)
- [Manuel Kurulum](#manuel-kurulum)
- [API Uçları](#api-uçları)
- [Sorun Giderme](#sorun-giderme)
- [Belgeler](#belgeler)

---

## Özellikler

| # | Özellik | Açıklama |
|---|---------|----------|
| 1 | **QR ile Menü Erişimi** | Masadaki QR kodu kameraya tut, menü anında açılır |
| 2 | **AI Chatbot Öneri** | Doğal dilde sorgu (Groq Llama 3.3 70B) → menüden filtreli öneri |
| 3 | **Konum Bazlı Keşif** | Harita üzerinde yakın restoranlar pin olarak; menüsüz gri, nötr mavi, tercihe uygun yeşil, uygun değil kırmızı |
| 4 | **Menü Görüntüleme** | Kategorize menü: ad, açıklama, fiyat, ~kalori, alerjen rozetleri |
| 5 | **Ürün Detayı** | Ürüne dokun → fiyat, tahminî kalori, alerjen ve tercihine göre uygunluk rozeti |
| 6 | **Kişisel Tercihler** | Vegan / glütensiz / laktoz / alerjen / bütçe — "Tercihleri Kaydet" ile kalıcı |
| 7 | **Kayıt / Giriş (JWT)** | Misafir + opsiyonel hesap: kayıt, giriş, çıkış; tokenlar güvenli saklanır |
| 8 | **Otomatik Menü Senkronu** | Dijital menü kaynağı her 60 sn'de taranır; fiyat/ürün değişiklikleri uygulamaya kendiliğinden yansır |
| 9 | **QR ile Keşif** | Sistemde olmayan restoranın web menü QR'ı okutulunca menü çıkarılıp kalıcı kaydedilir — restoran herkes için menülü olur ve otomatik senkrona dahil edilir |
| 10 | **Otomatik AI Menü Analizi** | Eksik bilgili (kalori/açıklama/alerjen) ürünler arka planda Groq ile periyodik doldurulur; yeni keşfedilen restoran kendiliğinden tamamlanır |

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| **Mobil** | React Native 0.81, Expo SDK 54, TypeScript, Expo Router |
| **Harita** | react-native-maps |
| **Backend** | Spring Boot 3.5.14, Java 17, Spring Data JPA, Hibernate |
| **Veritabanı** | H2 (demo, PostgreSQL uyumlu mod) / PostgreSQL (production) |
| **Auth** | Spring Security + JWT (jjwt 0.12.6) + BCrypt — misafir + opsiyonel giriş |
| **Yapay Zekâ** | Groq API (llama-3.3-70b-versatile) + Gemini (fallback) |
| **Veri Toplama** | Python (pandas, requests) + Google Places API |

---

## Proje Yapısı

```
pick-a-bite-demo/
├── demo-baslat.bat            ← Tek tıkla demo başlatıcı (Windows)
├── pick-a-bite-backend/       Spring Boot REST API
│   ├── src/main/java/com/aliyilmaz/
│   │   ├── controller/        App, Auth, Kullanici, Menu, QrKesif, Senkron controller'ları
│   │   ├── entities/          Kullanici, Restoran, Kategori, Urun
│   │   ├── services/          İş mantığı (senkron, QR keşif, AI zenginleştirme)
│   │   ├── repository/        Spring Data JPA repository'leri
│   │   ├── security/          JWT filtre + servisleri (aktif)
│   │   └── dto/               Veri transfer nesneleri
│   └── src/main/resources/application.properties
│
├── pick-a-bite-data/          Python + Node veri araçları
│   ├── main.py                Google Places API ile Bursa restoranları
│   ├── import-bursa.js        CSV'den restoranları backend'e aktarır
│   ├── collect-menus.js       Web siteli restoranların menülerini çeker
│   ├── enrich-menus.js        Eksik bilgi/ad'ı AI ile düzeltir
│   └── *.csv, menu.json       Toplanan veri
│
└── pick-a-bite-main/          React Native + Expo mobil uygulama
    ├── app/
    │   ├── (tabs)/index.tsx   Harita ana ekranı (backend'den restoranlar)
    │   ├── restaurant/[id].tsx Menü + ürün detay ekranı
    │   ├── chatbot.tsx        AI sohbet ekranı (Groq)
    │   ├── camera.tsx         QR tarayıcı
    │   ├── login.tsx, register.tsx  Giriş / kayıt
    │   └── profile.tsx        Tercih + bütçe yönetimi
    ├── lib/                   api, authService, menuService, groqClient
    ├── .env                   API anahtarları (git'e gitmez)
    └── docs/                  Proje belgeleri (PDF)
```

---

## Hızlı Başlangıç (Tek Tık)

> **Önkoşul:** JDK 17, Node.js, cloudflared kurulu olmalı (bkz. [Manuel Kurulum](#manuel-kurulum)).
> `.env` dosyasında Groq API anahtarı tanımlı olmalı.

**Windows'ta** repo kökündeki dosyaya çift tıkla:

```
demo-baslat.bat
```

Script otomatik olarak:
1. Eski servisleri kapatır (port 8080/8081)
2. **Backend**'i başlatır (Spring Boot, port 8080)
3. **Cloudflare Tunnel** açar (internetten erişim için)
4. **`.env`**'i yeni tunnel URL'i ile günceller
5. **Expo**'yu başlatır + **`expo-qr.png`** QR kodunu otomatik açar

Telefonda **Expo Go** uygulamasıyla QR'ı tara → demo telefonda açılır.

> Adım adım, sıfırdan kurulum için: [`LAPTOP-KURULUM.md`](LAPTOP-KURULUM.md)

---

## Manuel Kurulum

### Önkoşullar

```bash
# JDK 17
winget install Microsoft.OpenJDK.17

# Node.js (yoksa)
winget install OpenJS.NodeJS

# Cloudflare Tunnel (telefondan backend erişimi için)
winget install Cloudflare.cloudflared
```

### 1. API Anahtarı

`pick-a-bite-main/.env` dosyasını oluştur (örnek: `.env.example`):

```env
EXPO_PUBLIC_GROQ_API_KEY=gsk_xxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxx
EXPO_PUBLIC_GEMINI_API_KEY=xxxxxxxxxxxx   # opsiyonel
EXPO_PUBLIC_BACKEND_URL=http://localhost:8080/pick-a-bite
```

> Groq anahtarı ücretsiz: https://console.groq.com/keys

### 2. Backend

```bash
cd pick-a-bite-backend
./mvnw spring-boot:run
# → http://localhost:8080  (ilk açılış ~2-3 sn)
```

Demo, **H2 dosya tabanlı** veritabanı kullanır (kurulum gerektirmez). Örnek veri (129 Bursa restoranı) `pick-a-bite-backend/data/` altında repoyla birlikte **hazır gelir** — clone sonrası ek bir yükleme adımı gerekmez. Production için `application.properties` içinde PostgreSQL'e geçilebilir.

### 3. Frontend (Mobil)

```bash
cd pick-a-bite-main
npm install
npx expo start --tunnel
```

Telefonda **Expo Go** ile QR'ı tara.

> **Not:** `react-native-maps` web'i desteklemez — uygulama **yalnızca telefonda** (Android/iOS) çalışır. `localhost:8081`'i tarayıcıda açmak harita hatası verir, bu normaldir.

> Veritabanı bir şekilde boşsa, örnek 4 restoran + 20 ürünü `cd pick-a-bite-main && node populate.js` ile yükleyebilirsin.

### Telefon ↔ Backend Bağlantısı

Telefon, PC'deki backend'e iki şekilde ulaşabilir:

- **Aynı WiFi:** `.env`'de `EXPO_PUBLIC_BACKEND_URL=http://<PC-LAN-IP>:8080/pick-a-bite`
- **Cloudflare Tunnel (önerilen):** `cloudflared tunnel --url http://localhost:8080` → çıkan URL'i `.env`'e yaz

`demo-baslat.bat` ikinci yöntemi otomatik yapar.

---

## API Uçları

Tüm uçlar `/pick-a-bite` ön ekiyle başlar. Çoğu uç herkese açıktır; yalnızca kullanıcıya özel uçlar (`/auth/ben`, `/kullanici/**`) geçerli bir JWT gerektirir.

| Metod | Uç | Açıklama |
|-------|-----|----------|
| `GET` | `/restoranlar` | Tüm restoranlar |
| `GET` | `/restoranlar/menuler` | Tüm restoranlar + menüleri (tek istek) |
| `GET` | `/restoranlar/{id}/menu` | Restoran menüsü (kategori + ürün) |
| `GET` | `/restoranlar/yakin?enlem=&boylam=&radius=` | Konum bazlı yakın restoranlar |
| `GET` | `/restoranlar/qr/{kod}` | QR kod ile restoran/menü |
| `POST` | `/restoranlar/qr-kesif` | Web menü adresinden restoran keşfet + kalıcı ekle |
| `GET` | `/senkron/durum` | Otomatik menü senkronu durumu |
| `POST` | `/auth/kayit`, `/auth/giris` | Kayıt / giriş (JWT döner) |
| `GET` | `/auth/ben` | Giriş yapan kullanıcı (JWT gerekir) |
| `POST` | `/restoranlar`, `/restoranlar/{id}/kategoriler`, `/kategoriler/{id}/urunler` | Restoran / kategori / ürün ekle |

Ayrıntılı kullanım: [`pick-a-bite-backend/KULLANIM.md`](pick-a-bite-backend/KULLANIM.md)

---

## Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| **Chatbot "menü bilgisi yok" diyor** | Backend çalışmıyor veya `.env`'deki `BACKEND_URL` yanlış. Backend'i başlat, URL'i kontrol et. |
| **Haritada restoran yok** | Backend açık mı kontrol et; veri repoda hazır gelir, gerekirse `node populate.js`. |
| **`localhost:8081` tarayıcıda hata** | Normal — react-native-maps web'i desteklemez. Telefonda test et. |
| **Türkçe karakterler bozuk (Ä±)** | `application.properties`'te UTF-8 zorlaması var; backend'i yeniden başlat. |
| **Expo'da `GetEnv.NoBoolean: 1`** | `CI=1` yerine `CI=true` kullan ya da hiç kullanma. |
| **Tunnel düştü (530/503)** | `cloudflared`'i yeniden başlat, yeni URL'i `.env`'e yaz, Expo'yu yeniden başlat. |
| **Telefon backend'e ulaşamıyor** | Telefon ile PC aynı ağda mı? Ya da Cloudflare tunnel kullan. |

**Tüm servisleri durdurma:**
```bash
taskkill /F /IM cloudflared.exe /IM java.exe /IM node.exe
```

---

## Belgeler

`pick-a-bite-main/docs/` altında:

- **Gereksinim Dokümanı** — işlevsel/işlevsel olmayan gereksinimler
- **Uygulama Mimarisi** — 4 katmanlı mimari detayı
- **Sınıf Diyagramı** & **Kullanım Durum Diyagramı** — UML
- **Kullanım Kılavuzu** — ekran ekran kullanım
- **İş Planı** — haftalık görev dağılımı
- **Katalog** — ürün tanıtım broşürü

Ayrıca repoda: [`LAPTOP-KURULUM.md`](LAPTOP-KURULUM.md) — başka bir cihazda sıfırdan çalıştırma rehberi.

---

## Lisans

Bu proje Bursa Teknik Üniversitesi BLM0324 dersi kapsamında eğitim amaçlı geliştirilmiştir.
