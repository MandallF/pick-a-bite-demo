# 🧪 Pick A Bite — Baştan Sona Deneme Rehberi

> Uygulamayı ekran kaydı öncesi (veya sonrası) uçtan uca denemek için adım adım rehber.
> Her adımda **Yap** = ne yapacağın, **Dikkat** = doğru çalıştığının kanıtı.

---

## 0) Hazırlık

1. PC'de **`demo-baslat.bat`** çalışıyor olsun ("DEMO HAZIR" görünmeli, pencereler açık kalsın).
2. Telefon ve PC **aynı WiFi/hotspot**'ta.
3. Telefonda uygulama açıkken **Reload** yap (telefonu salla → *Reload*): en güncel kod yüklensin.
4. QR testleri için (Adım 7) PC'de üç QR üret — herhangi bir çevrimiçi QR üreticiye
   (örn. `goqr.me`) şu metinleri yapıştırıp ekranda göster:
   - **Geçerli restoran QR'ı:** `9de44c8f-1106-4160-b6fe-20ccc19668ca` (Tatlıcı Safa)
   - **Web menü QR'ı:** `https://www.burhanbalikcilik.com/`
   - **Geçersiz QR:** `merhaba-dunya-123`

---

## 1) İlk Açılış — Misafir Deneyimi

**Yap:** Uygulamayı aç, hiçbir şeye giriş yapmadan haritaya bak. Haritayı gezdir, uzaklaştır.

**Dikkat:**
- Harita Bursa genelinde **129 restoran pini** ile dolu olmalı (boş uygulama yok).
- Tercih seçilmediği için tüm pinler **mavi** (nötr).
- Giriş yapmadan harita/menü/chatbot kullanılabiliyor → **misafir modu** çalışıyor.

---

## 2) Kayıt, Giriş, Çıkış (Auth)

**Yap (kayıt):** Profil (sağ üst) → "Giriş Yap / Kayıt Ol" → **Kayıt Ol** → Ad, Soyad,
kendi uyduracağın bir e-posta + en az 6 karakter şifre → kaydol.

**Dikkat:** Kayıt sonrası profile dönünce üstte **kendi adın** yazmalı ("Misafir Kullanıcı" gitmeli).

**Yap (çıkış + yanlış şifre):** Profilin altında **Çıkış Yap** → tekrar "Giriş Yap" →
e-postanı doğru, şifreni **bilerek yanlış** gir.

**Dikkat:** Anlaşılır Türkçe hata: *"E-posta veya şifre hatalı."* (uygulama çökmemeli).

**Yap (giriş):** Doğru şifreyle gir. (Hazır kullanıcı da var: `kubilay@test.com` / `deneme123`)

**Dikkat:** Profil tekrar adını göstermeli. Uygulamayı kapatıp açınca **girişin korunmalı** (token saklanıyor).

---

## 3) Beslenme Tercihleri + Bütçe (en önemli zincir!)

**Yap:** Profil → **Vegan**'ı aç → Bütçe alanına `300` yaz → en alttaki **"Tercihleri Kaydet"** → "Tamam".

**Dikkat:**
- Kaydetmeden önce buton **turkuaz "Tercihleri Kaydet"**, kaydedince gri **"Tercihler Kayıtlı"** olur.
- "Tamam" deyince **otomatik haritaya döner**.
- Haritada renkler ANINDA değişmeli: menüsü olup vegan seçeneği olanlar **yeşil**,
  menüsü olup uygun olmayanlar **kırmızı**, menüsü henüz olmayan 122 restoran **mavi** kalır
  (bilmediğimiz şeye "uygunsuz" demiyoruz — bilinçli tasarım).

**Yap (geri alma provası):** Tercihi kapat → Kaydet → harita yine tamamen mavi olmalı.
Sonra Vegan'ı tekrar açıp kaydet (sonraki adımlar için açık kalsın).

---

## 4) Liste Görünümü + Arama

**Yap:** Haritanın üstündeki **Liste** görünümüne geç. Sonra arama kutusuna `burhan` yaz.

**Dikkat:**
- Sıralama akıllı olmalı: **tercihine uygunlar üstte → menüsü olanlar → en yakınlar**.
- Kart ikon renkleri haritadaki pin renkleriyle **aynı** olmalı.
- Menüsü olmayan restoranlarda gri rozet: *"Menü henüz yok — QR okutarak ekleyebilirsin"*.
- Arama anında filtrelemeli; silince tüm liste geri gelmeli.

---

## 5) Menülü Restoran + Ürün Detayı

**Yap:** **Nilüfer Burhan Balıkçılık**'ı aç (80 ürünlük gerçek menü). Banner'a ve
kategorilere bak; sonra herhangi bir ürüne **dokun**.

**Dikkat:**
- Banner'da kategori/ürün sayıları + **"Menü X dk önce kaynakla senkronlandı"** rozeti.
- Ürün kartlarında fiyat + **~kalori** (yaklaşık işaretiyle) + varsa kırmızı alerjen rozeti
  + "Detay için dokunun" ipucu.
- **Ürün detay modalı** alttan kaymalı ve şunları göstermeli: büyük fiyat, ~kalori (tahminî),
  alerjen kutusu (yoksa "Bilinen alerjen kaydı yok"), **tercihine göre uygunluk rozeti** —
  vegan açıkken et ürününde *"Şu tercihlerinizle uyumlu olmayabilir: Vegan"* yazmalı —
  ve en altta gri **"tahminîdir, kesin sağlık tavsiyesi değildir"** uyarısı.
- Vegan'a uygun bir üründe (örn. Tatlıcı Safa'da meyveli bir şey ya da Yeşil Ev'de salata)
  yeşil "uygun görünüyor" rozetini de gör.
- Menünün altındaki **"Bu Menü Hakkında Sor"** butonuna dokun → chatbot O restoranın
  menüsü yüklü olarak açılmalı ("✅ ... menüsünü inceledim!"); *"en hafif seçenek hangisi?"*
  diye sor → cevap kategorilere gruplu ve fiyat artan sıralı gelmeli.

---

## 6) Menüsüz Restoran (QR çağrısı)

**Yap:** Haritadan/listeden menüsü olmayan herhangi bir restoranı aç (mavi pinlerden biri,
örn. Kumrulabu).

**Dikkat:** Boş ekran DEĞİL — şık bir kart: *"Menü henüz eklenmedi… QR menüyü okutarak
menüyü siz ekleyebilirsiniz"* + **"QR Menü Okut"** butonu. Butona basınca kamera açılmalı.

---

## 7) QR Testleri (3 senaryo)

Alt menüden **QR Tara**'yı aç, hazırladığın üç QR'ı sırayla okut:

**a) Geçerli restoran QR'ı** (`9de44c8f-...` Tatlıcı Safa):
→ Doğrudan **Tatlıcı Safa menüsü** açılmalı.

**b) Web menü QR'ı** (`https://www.burhanbalikcilik.com/`):
→ Sistem bu kaynağı **tanımalı** (daha önce toplayıcıyla bağlandı) ve **Burhan Balıkçılık
menüsünü** açmalı — aynı kaynaktan **ikinci bir kopya restoran açılmamalı** (tekilleştirme kanıtı).

**c) Geçersiz QR** (`merhaba-dunya-123`):
→ *"Geçersiz QR Kod"* uyarısı + **Geri Dön / Tamam** seçenekleri. "Tamam" deyip kamerada
kalabilmeli, uyarı **kısır döngüye girmemeli**.

**d) 🎬 "Restoran Eklendi" sahnesi (video için):** Kök klasördeki **`qr-kesif-demo.bat`**'a
çift tıkla — sahte restoran sitesini (Köfteci Niyazi Usta) başlatır ve güncel IP'yle
**qr-4-kesif-demo.png**'yi üretip açar. Telefonla okut →
*"Restoran Eklendi 🎉 — Köfteci Niyazi Usta (9 ürün)"* + menü açılır; haritada yeni pin!
Sahneyi tekrar çekmek istersen restoranı silip yeniden okutman yeterli (bat penceresi
silme komutunu gösterir). Gerçek kayıtlar bozulmaz.

---

## 8) AI Chatbot (tercih + bütçe zekâsı)

**Yap:** Chatbot'u aç ve şu sorguları sırayla dene:

1. `300 TL altı tavuklu bir şeyler öner`
   → **Dikkat:** Öneriler **restorana göre gruplu**, fiyatlar bütçe altında, mesafe bilgisi var,
   en uygun fiyatlı seçenek vurgulu. Cevabın altındaki **"Restoranları haritada gör"** butonu haritaya götürmeli.
2. `bana tatlı öner` (Vegan hâlâ açıkken)
   → **Dikkat:** Vegan'a aykırı sütlü tatlıları ya elemeli ya açıkça uyarmalı (profil tercihini
   sorguda tekrarlamadan bilmesi = kişiselleştirme kanıtı). Bütçeyi `300` yaptıysan onu da aşmamalı.
3. Profil → Vegan'ı kapat, **Fıstık alerjisi**ni aç, Kaydet → chatbot'a dön: `kebap öner`
   → **Dikkat:** Cevabın SONUNDA güvenlik notu: *"⚠️ Ciddi hassasiyet durumunda sipariş öncesi
   işletmeden doğrulama yapmanız önerilir."*
4. `50 TL altı sushi var mı`
   → **Dikkat:** Uydurmamalı; "bulunamadı" deyip **kriter gevşetme** önermeli (bütçeyi artır, kategori değiştir).
5. Cevaplardaki **kalori değerleri "~" ile** (tahminî) yazılmalı.

---

## 9) Otomatik Menü Senkronizasyonu (final gösterisi 🎬)

**Yap:**
1. Telefonda **Tatlıcı Safa** menüsünü aç: *Fırın Sütlaç 80 TL* olduğunu gör.
2. PC'de `pick-a-bite-backend\menu-kaynak.json` dosyasını Not Defteri'yle aç,
   Fırın Sütlaç'ın `"fiyat": 80` değerini `95` yap, **kaydet**.
3. ~1 dakika bekle (backend penceresinde "Menü senkron: ... 80 -> 95" logu düşer).
4. Telefonda menüden çık, **tekrar gir**.

**Dikkat:** Fiyat **95 TL** olmalı ve banner rozeti *"Menü az önce kaynakla senkronlandı"*
demeli. **Hiçbir uygulama güncellemesi/yeniden başlatma olmadan** — restoran menüyü değiştirdi,
uygulama kendiliğinden yansıttı (hocanın istediği senaryo).

**Sonra geri al:** Dosyada `95` → `80` yap, kaydet (veri orijinal kalsın).

---

## 10) Bir Şey Ters Giderse

| Belirti | Muhtemel neden / çözüm |
|---|---|
| Harita boş / "ulaşılamadı" | Backend penceresi kapanmış → `demo-baslat.bat`'ı yeniden çalıştır |
| Eski ekranlar görünüyor (Kaydet butonu yok vs.) | Reload yapılmamış → telefonu salla → Reload |
| Chatbot cevap vermiyor | İnternet/Groq anahtarı → `.env` kontrol; backend açık mı |
| QR web keşfi yavaş | Normal: site çekiliyor (8-15 sn); başarısızsa chatbot geçici analize düşer |
| Renkler değişmedi | Tercihten sonra **Kaydet**'e basıldı mı? Haritaya dönüldü mü? |
| Türkçe karakter bozuk | Backend'i yeniden başlat (`demo-baslat.bat`) |

---

### Hızlı kontrol listesi (hepsini gördüysen uygulama TAM ✓)

- [ ] 129 pin, misafir kullanım
- [ ] Kayıt → gerçek ad · yanlış şifre hatası · çıkış → misafir · girişin kalıcılığı
- [ ] Tercih + bütçe kaydet → pinler yeşil/kırmızı, menüsüzler mavi
- [ ] Liste sıralaması + arama + "menü henüz yok" rozeti
- [ ] Ürün detayında uygunluk rozeti + tahminî uyarısı
- [ ] Menüsüz restoranda "QR Menü Okut" çağrısı
- [ ] QR: geçerli ✓ / web-tekilleştirme ✓ / geçersiz uyarı ✓
- [ ] Chatbot: gruplu öneri, bütçe, tercih, alerjen uyarısı, boş sonuç
- [ ] menu-kaynak.json değişikliği ~1 dk'da telefonda
