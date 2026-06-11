/**
 * Menü toplayıcı: web sitesi bilinen restoranların menülerini çekip
 * veritabanına HAZIR yükler — yeni kullanıcı uygulamayı boş görmesin.
 *
 * Akış: CSV'deki "Web Sitesi" alanı dolu restoranlar için backend'in
 * /restoranlar/qr-kesif ucu "restoranId bağlama" modunda çağrılır:
 * menü sunucuda çıkarılır, restorana işlenir, kaynak URL kaydedilir
 * (otomatik URL senkronuna girer). Menü çıkarılamayan siteler atlanır —
 * o restoranlar kullanıcıların QR keşfine kalır (tasarım gereği).
 *
 * Tekrar çalıştırmak güvenlidir: menüsü zaten olan restoranlar atlanır.
 *
 * Kullanım: backend açıkken  ->  node collect-menus.js
 */
const fs = require("fs");
const path = require("path");

const BACKEND = process.env.BACKEND_URL || "http://localhost:8080/pick-a-bite";
const CSV_YOLU = path.join(__dirname, "bursa_restoranlar.csv");
const ISTEK_ZAMAN_ASIMI_MS = 30000; // site + ayrıştırma için üst sınır
const ISTEKLER_ARASI_MS = 300; // sitelere nazik davran

function csvParse(metin) {
  const satirlar = [];
  let alan = "", satir = [], tirnakIcinde = false;
  if (metin.charCodeAt(0) === 0xfeff) metin = metin.slice(1);
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnakIcinde) {
      if (c === '"') {
        if (metin[i + 1] === '"') { alan += '"'; i++; }
        else tirnakIcinde = false;
      } else alan += c;
    } else if (c === '"') tirnakIcinde = true;
    else if (c === ",") { satir.push(alan); alan = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && metin[i + 1] === "\n") i++;
      satir.push(alan); alan = "";
      if (satir.some((a) => a.trim() !== "")) satirlar.push(satir);
      satir = [];
    } else alan += c;
  }
  if (alan !== "" || satir.length) { satir.push(alan); if (satir.some((a) => a.trim() !== "")) satirlar.push(satir); }
  return satirlar;
}

const normalize = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // 1) CSV: web sitesi olan restoranlar
  const [baslik, ...satirlar] = csvParse(fs.readFileSync(CSV_YOLU, "utf8"));
  const kol = (ad) => baslik.findIndex((b) => normalize(b) === normalize(ad));
  const iAd = kol("Restoran Adı"), iWeb = kol("Web Sitesi");

  const adaylar = [];
  const gorulen = new Set();
  for (const s of satirlar) {
    const ad = (s[iAd] || "").trim();
    const web = (s[iWeb] || "").trim();
    if (!ad || !/^https?:\/\//i.test(web)) continue; // "Web Sitesi Yok" vb. ele
    const anahtar = normalize(ad);
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    adaylar.push({ ad, web });
  }
  console.log(`CSV'de web sitesi olan ${adaylar.length} restoran bulundu.\n`);

  // 2) Backend durumu: restoran id'leri + menüsü zaten olanlar
  const menuler = await (await fetch(`${BACKEND}/restoranlar/menuler`)).json();
  const adToRestoran = new Map();
  const menuluIdler = new Set();
  for (const m of menuler) {
    adToRestoran.set(normalize(m.restoran.restoranAdi), m.restoran);
    const urunSayisi = (m.kategoriler || []).reduce(
      (t, k) => t + (k.urunler || []).length, 0);
    if (urunSayisi > 0) menuluIdler.add(m.restoran.id);
  }

  // 3) Her aday için menüyü çekmeyi dene
  let basarili = 0, menusuzKaldi = 0, eslesmeyen = 0, zatenMenulu = 0;
  const kazanimlar = [];
  for (const { ad, web } of adaylar) {
    const restoran = adToRestoran.get(normalize(ad));
    if (!restoran) { eslesmeyen++; continue; }
    if (menuluIdler.has(restoran.id)) { zatenMenulu++; continue; }

    process.stdout.write(`-> ${ad} (${web}) ... `);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ISTEK_ZAMAN_ASIMI_MS);
      const res = await fetch(`${BACKEND}/restoranlar/qr-kesif`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ url: web, restoranId: restoran.id }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.ok) {
        const sonuc = await res.json();
        console.log(`MENÜ ALINDI (${sonuc.urunSayisi} ürün)`);
        basarili++;
        kazanimlar.push({ ad, urun: sonuc.urunSayisi });
      } else {
        const hata = await res.json().catch(() => ({}));
        console.log(`alınamadı (${hata.mesaj || "HTTP " + res.status}) — QR keşfine kaldı`);
        menusuzKaldi++;
      }
    } catch (e) {
      console.log(`alınamadı (${e.name === "AbortError" ? "zaman aşımı" : e.message}) — QR keşfine kaldı`);
      menusuzKaldi++;
    }
    await bekle(ISTEKLER_ARASI_MS);
  }

  // 4) Özet
  console.log("\n========== ÖZET ==========");
  console.log(`Menü alınan restoran : ${basarili}`);
  console.log(`Alınamayan (QR'a kaldı): ${menusuzKaldi}`);
  console.log(`Zaten menülü/atlanan  : ${zatenMenulu}, eşleşmeyen ad: ${eslesmeyen}`);
  if (kazanimlar.length) {
    console.log("\nKazanılan menüler:");
    for (const k of kazanimlar) console.log(`  - ${k.ad}: ${k.urun} ürün`);
  }
  const son = await (await fetch(`${BACKEND}/restoranlar/menuler`)).json();
  const sonMenulu = son.filter(
    (m) => (m.kategoriler || []).reduce((t, k) => t + (k.urunler || []).length, 0) > 0
  ).length;
  console.log(`\nVeritabanında artık ${son.length} restoran, ${sonMenulu} tanesi menülü.`);
})();
