# Pick A Bite — Demo Build

> Sunum demosu için hazırlanmış kişisel monorepo. **BLM0324 — Yazılım Mühendisliği** dersi proje ödevi.

Yapay zekâ destekli, konum tabanlı bir **menü öneri sistemi**. Kullanıcılar QR kod ile restoran menülerine erişir, bütçe / alerjen / beslenme tercihlerine göre AI chatbot'tan öneri alır.

## Yapı

```
pick-a-bite-demo/
├── pick-a-bite-backend/   # Spring Boot 3.5 (Java 17) + PostgreSQL + JWT
├── pick-a-bite-data/      # Python veri toplama (Google Places API)
└── pick-a-bite-main/      # React Native + Expo (mobil + chatbot)
```

## Hızlı Başlangıç (Sadece Frontend — Demo İçin Yeterli)

```bash
cd pick-a-bite-main
npm install
cp .env.example .env
# .env içine Groq API key'i yaz
npx expo start
```

Expo Go ile QR'ı oku → telefonunda çalışır. Veya `w` → web tarayıcıda.

## Tam Stack (Backend Dahil)

### Backend (Spring Boot)
```bash
cd pick-a-bite-backend
# PostgreSQL'de "postgres" database hazır olmalı
./mvnw spring-boot:run
# Port 8080'de çalışır, prefix: /pick-a-bite/
```

### Frontend
```bash
cd pick-a-bite-main
# .env içinde BACKEND_URL=http://localhost:8080/pick-a-bite
npx expo start
```

## Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Mobil | React Native, Expo SDK 54, TypeScript, Expo Router |
| Backend | Spring Boot 3.5.14, Java 17, Spring Data JPA, JWT |
| Veritabanı | PostgreSQL |
| AI | Groq (llama-3.3-70b-versatile) + Gemini (fallback) |
| Harita | react-native-maps |
| Veri Toplama | Python (pandas, Google Places API) |

## Yapılan İşler

- Spring Boot REST API + JWT auth (controller, service, repository, DTO)
- PostgreSQL şeması (Kullanici, Restoran, Kategori, Urun, QRKod, ChatSession, ChatMessage)
- Python veri toplama (Bursa restoranları + menüleri JSON)
- React Native mobil arayüz (harita, QR, profil, chatbot)
- Groq API entegrasyonu — chatbot doğal dil öneri
- AsyncStorage ile kullanıcı tercih kalıcılığı

## Belgeler

`pick-a-bite-main/docs/` altında:
- Gereksinim Dokümanı
- İş Planı
- Katalog
- Kullanım Durum Diyagramı
- Kullanım Kılavuzu v1.0
- Sınıf Diyagramı
- Uygulama Mimarisi
