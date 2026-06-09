# 🎤 Pick A Bite — Sunum Hazırlık Metni

> **Ders:** BLM0324 Yazılım Mühendisliği · **Grup 8** · Bursa Teknik Üniversitesi
> **Proje:** Konum bazlı, yapay zekâ destekli restoran menü öneri uygulaması
> Bu metin sunum öncesi okunmak içindir. Sahnede ezber değil, akıştan konuş.

---

## 1) 30 Saniyelik Açılış (ezberlenebilir giriş)

> "Merhaba, ben Kubilay. Projemiz **Pick A Bite** — dışarıda yemek seçerken
> yaşadığımız 'ne yesem, nereye gitsem, bu bana uygun mu?' kararsızlığını çözen
> bir mobil uygulama. Kullanıcı haritadan veya masadaki **QR koddan** restoran
> menüsüne ulaşıyor; **yapay zekâ asistanı** bütçesine, kalorisine ve beslenme
> kısıtlarına (vegan, glütensiz, alerji vb.) göre ona özel öneri yapıyor.
> Şimdi canlı olarak telefonumda göstereceğim."

**Tek cümlelik özet (hoca acele ederse):**
*"AI destekli, konum ve QR tabanlı kişisel menü asistanı."*

---

## 2) Problem & Çözüm

| Problem | Pick A Bite çözümü |
|---|---|
| Menüde ne olduğunu, fiyatı, kaloriyi bilmeden karar veriyoruz | QR / harita ile **anlık dijital menü** |
| "Vegan/glütensizim, bu yemek bana uygun mu?" belirsizliği | Profil tercihine göre **otomatik uygunluk taraması** |
| "300 TL'ye ne yiyebilirim?" diye düşünmek zaman alıyor | **AI asistan** bütçe + isteğe göre saniyeler içinde öneri |
| Alerji riski | **Çift katmanlı alerjen uyarısı** (kod filtresi + AI uyarısı) |

---

## 3) Teknoloji Yığını (ne + NEDEN)

| Katman | Teknoloji | Neden seçtik |
|---|---|---|
| **Mobil** | React Native + Expo (SDK 54) + TypeScript | Tek kod tabanıyla Android/iOS; hızlı geliştirme; tip güvenliği |
| **Navigasyon** | Expo Router (dosya tabanlı) | Modern, sade yönlendirme |
| **Backend** | Spring Boot 3.5.14 (Java 17) | Kurumsal standart; katmanlı mimari; REST + JPA + Security |
| **Veritabanı** | H2 (PostgreSQL uyumlu mod) | Kurulumsuz demo; tek satırla PostgreSQL'e geçiş |
| **Yapay Zekâ** | Groq API — `llama-3.3-70b-versatile` | Ücretsiz, çok hızlı çıkarım; Türkçe yanıt; **Gemini** yedek |
| **Harita/Konum** | react-native-maps + expo-location | Konum bazlı yakınlık (Haversine mesafe) |
| **QR** | expo-camera | Masadaki QR'dan menüye |
| **Dağıtım** | Cloudflare Tunnel + Expo LAN | Telefonun PC backend'ine güvenli erişimi |

---

## 4) Mimari — Veri Nasıl Akıyor?

```
[Telefon / Expo]  ──REST──>  [Spring Boot API]  ──JPA──>  [H2 Veritabanı]
       │                            (restoran, menü, kategori, ürün)
       │
       └──> Menü verisini AI'ın istem (prompt) bağlamına ENJEKTE ederiz
            └──>  [Groq llama-3.3-70b]  ──> kişisel Türkçe öneri
```

**Önemli mimari fikir:** AI'a "uydur" demiyoruz. Backend'den **gerçek menü
verisini** çekip istemin içine koyuyoruz; model yalnızca **var olan ürünler**
üzerinden öneri yapıyor (RAG mantığı). Bu, halüsinasyonu büyük ölçüde engelliyor.

**Backend katmanları:** Controller → Service → Repository → Entity (+ DTO katmanı,
interface segregation). Bu, dersteki katmanlı mimari ve SOLID prensiplerinin
uygulamasıdır.

---

## 5) 🎬 CANLI DEMO SENARYOSU (adım adım — sahnede bunu izle)

> **Önce:** Telefon + laptop aynı ağda mı, uygulama açık mı kontrol et.
> Sakin konuş, her ekranda 1-2 cümle.

**1. Harita (açılış ekranı)**
- Söyle: *"Açılışta kullanıcı çevresindeki restoranları haritada görüyor —
  şu an Bursa'da 4 örnek restoran var."*
- Yap: Haritayı göster, pinlere dikkat çek.

**2. Profil & Tercihler (FARK YARATAN AN)**
- Söyle: *"Şimdi beslenme tercihi olarak Vegan'ı açıp kaydediyorum."*
- Yap: Profil → **Vegan** aç → **"Tercihleri Kaydet"** → "Tamam".
- Söyle: *"Dikkat edin — haritaya döndüğümde pinler renklendi. Yeşil =
  bu tercihime uygun seçeneği olan restoran, kırmızı = uygun olmayan.
  Yani uygunluk gerçekten taranıyor, sadece etiket değil."*

**3. Restoran & Menü**
- Söyle: *"Bir restorana girdiğimde kategorilere ayrılmış menü; her üründe
  fiyat, tahmini kalori ve alerjen bilgisi var."*
- Yap: Bir pine dokun → menüyü göster.

**4. QR ile Menü**
- Söyle: *"Gerçek senaryoda masadaki QR'ı okutuyoruz."*
- Yap: Alt buton → kamera → QR. (Geçersiz QR denenirse: *"Sisteme kayıtlı
  olmayan QR'da kullanıcıyı uyarıp güvenle geri döndürüyoruz."*)

**5. AI Asistan (FİNAL — en etkileyici)**
- Söyle: *"Asıl değer burada. Asistana doğal dille soruyorum."*
- Yaz/sor: **"300 TL altı, vegan, doyurucu bir şeyler öner"**
- Söyle: *"Gördüğünüz gibi öneriyi restoranlara göre grupladı, mesafeyi ve
  en uygun fiyatı belirtti, tercihime aykırı ürünleri elemiş. Altta da
  'Haritada gör' ile bu restoranlara atlayabiliyorum."*

**Kapanışta vurgula:** *"Tercih → renk → AI önerisi zinciri tamamen tutarlı
çalışıyor; tek bir veri kaynağından besleniyor."*

---

## 6) Bu Son Sprint'te Neler Yaptık? (jüriye anlatılacak gelişim)

Son geliştirme turunda uygulamayı "çalışan demo"dan "tutarlı ürün"e taşıdık:

1. **AI asistanı zekileştirdik:** Öneriler artık restoranlara **gruplanıyor**,
   **mesafe** ve **en ucuz seçenek** vurgulanıyor; bütçe/kalori/alerjen
   kurallarına uyuyor; sonuç yoksa kullanıcıyı yönlendiriyor.
2. **Mesaj görünümü (Markdown):** AI yanıtları başlık/liste olarak düzgün
   render ediliyor; öneriden restoran detayına geçiş eklendi.
3. **Alerjen güvenliği:** Tercihlere göre **çift katmanlı** kontrol — kod
   tarafı filtre + AI'ın açık uyarısı ("ciddi alerjide restorana doğrulatın").
4. **Harita/Liste uygunluğu:** Tercih yoksa nötr (mavi), uygun (yeşil),
   uygun değil (kırmızı); liste ve harita renkleri eşitlendi.
5. **Tercih kaydetme akışı:** Profile **"Tercihleri Kaydet"** butonu — seçim
   kaydedilince harita anında güncelleniyor (odak yenileme ile).
6. **Geçersiz QR yönetimi:** Kayıtlı olmayan QR'da sonsuz uyarı yerine kontrollü
   "Geri Dön / Tamam" akışı.
7. **Taşınabilir kurulum:** Örnek veritabanı + `.env` şablonu + adım adım
   kurulum rehberi ile proje başka bir cihazda **tek tıkla** ayağa kalkıyor.

---

## 7) Karşılaştığımız Zorluklar & Öğrendiklerimiz

> Hoca neredeyse kesin "en çok ne zorladı / ne öğrendiniz?" diye sorar. Hazır ol.

- **Telefon ↔ backend bağlantısı:** Yerel sunucuya telefondan erişim en büyük
  baş ağrısıydı. Çözüm: **Cloudflare Tunnel** (backend'i güvenle internete açar)
  + **Expo LAN** modu. *Öğrendik: dağıtım/ağ, koddan daha zor olabiliyor.*
- **AI yanıt kalitesi:** İlk yanıtlar genel/yanlıştı. **İstem mühendisliği**
  (prompt engineering) ile menü verisini bağlama enjekte edince doğrulaştı.
  *Öğrendik: LLM'e ne verdiğin, nasıl sorduğun kadar önemli.*
- **Veri tutarlılığı:** "Kazandibi vegan mı?" gibi ince filtre hataları çıktı;
  süt bazlı tatlıları kapsayan kuralları netleştirdik. *Öğrendik: domain
  kuralları titizlik ister.*
- **Tam yığın entegrasyon:** Mobil + REST + veritabanı + AI'ı tek akışta
  buluşturmak. *Öğrendik: katmanları ayırmak (DTO, servis) entegrasyonu kolaylaştırıyor.*
- **Türkçe karakter/encoding, tip güvenliği:** UTF-8 zorlaması, `tsc` ile tip
  kontrolü ve bundle doğrulamasını sürece kattık.

---

## 8) ❓ Hocanın Sorabileceği Sorular + Hazır Cevaplar

**S: Neden React Native / Expo? Native yazsaydınız?**
C: Tek kod tabanıyla hem Android hem iOS; sınırlı sürede hızlı prototip; Expo
servisleri (kamera, konum) kurulumu kolaylaştırdı. Native'in performans avantajı
bu ölçekte gerekli değildi.

**S: Neden H2 kullandınız, gerçek bir veritabanı değil?**
C: H2'yi **PostgreSQL uyumlu modda** çalıştırıyoruz; aynı SQL'i konuşuyor. Demo
için kurulum istemiyor. Üretimde `application.properties`'te **tek bağlantı
satırını** değiştirip PostgreSQL'e geçeriz — kod değişmez. Yani bilinçli bir
demo tercihi, mimari kısıt değil.

**S: Yapay zekâ uydurma (halüsinasyon) yapmaz mı? Olmayan yemeği önerirse?**
C: Bunu en baştan tasarladık. Model serbest cevap vermiyor; **backend'den gelen
gerçek menüyü istemin içine koyuyoruz** ve "yalnızca verilen ürünlerden öner"
diyoruz (RAG yaklaşımı). Ürün, fiyat, kalori hep gerçek veriden geliyor.

**S: Alerjisi olan birine yanlış öneri verirse sorumluluk?**
C: İki katmanlı koruma var: (1) kod tarafında tercihe aykırı ürünleri **eleyen
filtre**, (2) AI'ın yanıtında **açık uyarı**: "ciddi alerjide siparişten önce
restorana doğrulatın." Tıbbi kesinlik iddia etmiyoruz; karar desteği sunuyoruz.

**S: Restoran/menü verisi nereden geldi?**
C: **Google Places API** ile Bursa'daki gerçek mekânlardan topladık (Python
betiği); demo için temsilî 4 restoran + 20 ürün seçtik. Mimari, gerçek
restoranların kendi menülerini girmesine uygun (POST uçları hazır).

**S: Güvenlik? API anahtarları, kimlik doğrulama?**
C: API anahtarları `.env`'de ve **Git'e gönderilmiyor** (.gitignore). Backend'de
**JWT altyapısı** kurulu (token üretimi, filtre, BCrypt); demoyu hızlandırmak için
şu an açık bıraktık, üretimde aktifleşir. Cloudflare tunnel HTTPS sağlıyor.

**S: Ölçeklenebilir mi? 10.000 restoran olsa?**
C: Backend **stateless REST**; yatay ölçeklenebilir. Veritabanı PostgreSQL'e
geçer, konum sorguları indekslenir. AI çağrıları kullanıcı başına bağımsız.
Harita yükü için sayfalama/yakınlık sorgusu (`/restoranlar/yakin`) hazır.

**S: Hangi yazılım mühendisliği süreçlerini uyguladınız?**
C: Gereksinim analizi ve **UML diyagramları** (use-case, sınıf, sıra) ile başladık;
**katmanlı mimari** (Controller-Service-Repository) ve **DTO** desenini uyguladık;
**Git/GitHub** ile sürüm kontrolü; iteratif (sprint benzeri) geliştirme yaptık;
her değişikliği tip kontrolü + derleme doğrulamasıyla test ettik.

**S: Test ettiniz mi? Otomatik test var mı?**
C: Geliştirme boyunca **TypeScript tip kontrolü** (`tsc`) ve **Metro derleme
doğrulaması** ile her değişikliği denetledik; backend uçlarını manuel/entegrasyon
olarak test ettik. Birim test kapsamı, ürünleşme adımında genişletilecek bir sonraki hedefimiz.

**S: Gerçek bir ürün olsaydı ne eksik?**
C: Restoranların kendi paneli, ödeme entegrasyonu, kullanıcı yorum/puanı, daha
geniş veri ve birim test kapsamı. Çekirdek akış (keşif → menü → AI öneri) çalışıyor;
eksikler iş katmanı genişletmeleri.

**S: En büyük teknik zorluk neydi?**
C: Telefonun yerel backend'e güvenli erişimi. Cloudflare Tunnel ile çözdük.
İkincisi AI yanıt kalitesiydi; istem mühendisliği ve gerçek veri enjeksiyonuyla
düzelttik.

**S: Projeyi tek başına mı geliştirdin / katkı dağılımı?**
C: *(Dürüst ve profesyonel ver.)* "Planlama ve tasarım grup olarak başladı;
uygulamanın tam yığın geliştirmesini, entegrasyonunu ve demoya hazırlığını ben
yürüttüm. Bu süreçte mobil, backend ve AI entegrasyonunu uçtan uca deneyimledim."
*(Suçlayıcı dil kullanma; kendi öğrendiklerine odaklan.)*

---

## 9) Kapanış Cümlesi

> "Özetle Pick A Bite, konum ve QR ile menüye ulaşmayı, yapay zekâyla da bu
> menüyü kişiselleştirmeyi tek akışta birleştiriyor. Bu süreçte tam yığın bir
> uygulamayı tasarlamayı, gerçek veriyle AI'ı güvenli biçimde birleştirmeyi ve
> dağıtım sorunlarını çözmeyi öğrendim. Teşekkürler, sorularınızı alabilirim."

---

## 10) 🚨 Plan B — Demo Sırasında Bir Şey Çökerse

- **Telefon bağlanmazsa:** Telefon hotspot'unu aç, laptopu ona bağla (en garanti).
- **Backend cevap vermezse / AI 'menü yok' derse:** *"Sunucu yeniden bağlanıyor"*
  de, sakin kal; `demo-baslat.bat`'ı kapatıp tekrar başlatma hazır olsun.
- **İnternet giderse:** AI çalışmaz ama **harita, menü, QR, uygunluk renkleri**
  yerel/önbellekten çalışmaya devam eder — onları göster.
- **Her şey çökerse:** Telefonda önceden alınmış **ekran görüntüleri/kayıt** ile
  akışı anlat. *(Sunum öncesi 1 kez baştan sona ekran kaydı al — en iyi sigorta.)*
- **Altın kural:** Panik yok. *"Demoda canlı sistemlerle çalışmanın doğası bu;
  mimariyi anlatayım"* deyip akışı sözlü sürdür.

---

## 11) ⚡ Hızlı Referans Kartı (rakamlar ezberde olsun)

- **AI modeli:** Groq `llama-3.3-70b-versatile` (yedek: Gemini)
- **Backend:** Spring Boot 3.5.14 · Java 17 · H2 (PostgreSQL uyumlu)
- **Mobil:** React Native + Expo SDK 54 + TypeScript
- **Örnek veri:** 4 restoran (Tatlıcı Safa, Lezzet Durağı, Yeşil Ev, Lezzet
  Kebapçısı) · 20 ürün
- **8 beslenme tercihi:** vegan, vejetaryen, glütensiz, laktoz, fıstık alerjisi,
  helal, düşük kalori, yüksek protein
- **Konum:** Bursa (40.1885, 29.061) · mesafe = Haversine
- **Renk kodu:** mavi = tercih yok · yeşil = uygun · kırmızı = uygun değil
- **Örnek AI sorusu:** *"300 TL altı, vegan, doyurucu bir şeyler öner"*
</content>
