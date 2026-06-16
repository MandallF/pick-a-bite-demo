# 🎬 Pick A Bite — Demo Video Senaryosu (maks. 5 dk)

> **Format (hoca):** Giriş → Kısa ürün tanıtımı → Kullanım senaryoları.
> Çalışan son ürünle çekilecek. Grup başına 1 video. LinkedIn + GitHub'da
> paylaşılıp tüm takım + hoca etiketlenecek.
> **Hedef süre:** ~4:45 (5 dk'yı aşma — tampon bırak).

---

## 0) Çekimden ÖNCE hazırlık (kayda başlamadan)

- [ ] `demo-baslat.bat` çalışıyor, "DEMO HAZIR" görünüyor (backend + Expo açık)
- [ ] Telefon + PC aynı WiFi/hotspot; uygulamada **Reload** yapıldı (en güncel kod)
- [ ] Profilde tercihler **kapalı** başlasın (senaryoda açacağız)
- [ ] QR'lar hazır: `test-qr/` klasöründe qr-1 (geçerli), qr-2 (web menü); keşif
      sahnesi için **`qr-kesif-demo.bat`** çalıştırılıp qr-4 açık
- [ ] Telefon ekran kaydedici hazır (Android: Hızlı Ayarlar → **Ekran Kaydı**, mikrofon AÇIK)
- [ ] Bildirimleri sustur (rahatsız etmesin), pili/şarjı kontrol et
- [ ] Senaryoyu 1 kez **prova** et — takılmadan akması için

---

## 1) GİRİŞ — 0:00–0:25

**Göster:** Uygulamanın açık hali (harita ekranı, pinler görünür).
**Söyle:**
> "Merhaba, biz **Grup 8**. Bu uygulama **Pick A Bite** — yapay zekâ destekli,
> konum tabanlı bir restoran menü öneri uygulaması. Dışarıda yemek seçerken
> yaşadığımız *'ne yesem, nereye gitsem, bu bana uygun mu?'* kararsızlığını
> çözüyor. Şimdi uçtan uca gösterelim."

---

## 2) KISA ÜRÜN TANITIMI — 0:25–1:05

**Göster:** Haritayı gezdir (Bursa'daki pinler), pin renklerine işaret et; bir
de **Liste** görünümüne geçip geri dön.
**Söyle:**
> "Açılışta Bursa'daki gerçek restoranlar haritada görünüyor. Pin renkleri bir
> bakışta bilgi veriyor: **gri** menüsü henüz olmayan, **mavi** nötr, **yeşil**
> tercihime uygun, **kırmızı** uygun değil. Harita ya da liste olarak
> inceleyebiliyorum. Teknik olarak mobil tarafı React Native, sunucu Spring
> Boot, öneriler için Groq yapay zekâ modeli çalışıyor."

---

## 3) KULLANIM SENARYOLARI

### Senaryo 1 — Kişiselleştirme (tercih + bütçe) · 1:05–1:50
**Göster:** Profil → **Vegan**'ı aç + **bütçe 300** yaz → **Tercihleri Kaydet** →
"Tamam" → otomatik haritaya dön (pinler renklendi) → kısaca Liste görünümü.
**Söyle:**
> "Diyelim ki veganım ve bütçem 300 lira. Profilden tercihlerimi seçip
> kaydediyorum. Dikkat edin — haritaya döndüğümde restoranlar **anında**
> renklendi: bana uygun olanlar yeşil. Listede de uygun olanlar en üstte.
> Sistem her restoranın menüsünü gerçekten tarıyor."

### Senaryo 2 — Menü, ürün detayı ve AI asistan · 1:50–3:05
**Göster:** Menülü bir restoran aç (ör. **Burhan Balıkçılık** — zengin menü) →
kategorileri/fiyat/kalori/alerjen göster → bir ürüne **dokun** (detay modalı:
uygunluk rozeti + "tahminî" uyarısı) → modalı kapat → alttaki **"Bu Menü
Hakkında Sor"** → chatbot → *"en hafif seçenek hangisi?"* yaz → gruplu cevap.
**Söyle:**
> "Bir restorana girdiğimde menü kategorilere ayrılmış; her üründe fiyat,
> tahminî kalori ve alerjen bilgisi var. Ürüne dokununca detayını ve tercihime
> uygunluğunu görüyorum — bu bilgiler yapay zekâ ile üretildiği için *tahminî*
> olduğu açıkça belirtiliyor. Asıl güç burada: **'Bu Menü Hakkında Sor'**
> diyorum ve asistana doğal dille soruyorum. Cevabı kategorilere göre, fiyat
> sıralı ve bana özel veriyor."

*(İstersen genel chatbot'u da göster: ana ekrandan chatbot → "300 TL altı
vegan bir şeyler öner" → restorana göre gruplu öneri → "Haritada gör".)*

### Senaryo 3 — QR ile erişim, keşif ve otomatik sistem · 3:05–4:25
> Bu bölüm hocanın özellikle istediği "restoran ekleme + otomatik senkron"u içerir.

**Göster (a) Geçerli QR:** QR Tara → **qr-1** (Tatlıcı Safa) okut → menü açılır.
**Göster (b) QR ile keşif:** QR Tara → **qr-4 / qr-2** (web menü) okut →
**"Restoran Eklendi 🎉"** bildirimi → menü açılır → haritaya dön, **yeni pin**.
**Göster (c) Otomatik senkron:** PC'de `menu-kaynak.json`'da bir fiyatı değiştir
(ör. Fırın Sütlaç 80→95) → *(videoyu burada kes, ~1 dk geçişi atla)* → telefonda
menüye tekrar gir → **güncellenmiş fiyat**.
**Söyle:**
> "QR ile masadaki menüye anında ulaşıyorum. Daha güçlüsü: sistemde **olmayan**
> bir restoranın web menüsünü okuttuğumda, menüsüyle birlikte **otomatik
> ekleniyor** ve haritada herkes için görünür oluyor. Kalori, alerjen gibi
> bilgiler de arka planda yapay zekâ ile **kendiliğinden** doluyor. Üstelik
> restoran menüsünde bir değişiklik olduğunda — mesela bir fiyat güncellenince —
> uygulamaya **otomatik** yansıyor. Hiçbir elle müdahale yok."

---

## 4) KAPANIŞ — 4:25–4:45

**Göster:** Harita ekranı (renkli pinlerle) ya da sade bir kapanış karesi.
**Söyle:**
> "Özetle Pick A Bite; konum ve QR ile menüye ulaşmayı, yapay zekâyla
> kişiselleştirmeyi ve menüleri otomatik güncel tutmayı tek akışta birleştiriyor.
> İzlediğiniz için teşekkürler. — **Grup 8**"

---

## 5) Çekim ipuçları

- **Ekran kaydı + ses:** Android yerleşik kaydedici yeterli. Anlatımı kayıt
  sırasında sesli yap **ya da** sessiz çekip sonradan voice-over ekle (daha temiz olur).
- **Gerçek-zamanlı beklemeleri KES:** Otomatik senkron ve AI zenginleştirme
  ~1-2 dk sürer. Videoda **bekleme gösterme** — o anı kesip "kısa süre sonra"
  diyerek güncellenmiş hâle geç (basit bir kesme/montaj yeterli).
- **Akıcılık:** Her sahneyi takılmadan al; takılırsan tekrar çek, en temizini kullan.
- **Süre:** Provada kronometre tut. 5 dk'yı aşıyorsan Senaryo 2'deki genel
  chatbot kısmını kısalt.
- **Görünürlük:** Telefon parlaklığını artır; yazarken acele etme ki izleyici okuyabilsin.

---

## 6) Paylaşım (hocanın notu)

- **GitHub:** Videoyu repoya/READMEye ekle (ya da link ver). Repo: `MandallF/pick-a-bite-demo`.
- **LinkedIn:** Videoyu kısa bir açıklamayla paylaş; **tüm takım üyelerini + hocayı etiketle**.
- Önceki paylaşım kuralları geçerli.
