/**
 * Google Places taramasıyla toplanan Bursa restoranlarını (bursa_restoranlar.csv)
 * backend'e aktarır.
 *
 * - Tekrar çalıştırmak güvenlidir: aynı ad + yakın koordinattaki restoran atlanır.
 * - Menü EKLENMEZ: bu restoranların menüsü ya QR keşfiyle (kullanıcı okutunca)
 *   ya da toplayıcı boru hattıyla gelir; o zamana dek uygulama "menü henüz yok"
 *   gösterir (gereksinim md.9'a uygun).
 *
 * Kullanım: backend açıkken  ->  node import-bursa.js
 */
const fs = require("fs");
const path = require("path");

const BACKEND = process.env.BACKEND_URL || "http://localhost:8080/pick-a-bite";
const CSV_YOLU = path.join(__dirname, "bursa_restoranlar.csv");

/** Tırnaklı alanları ve alan içi virgülleri doğru işleyen küçük CSV ayrıştırıcı. */
function csvParse(metin) {
  const satirlar = [];
  let alan = "", satir = [], tirnakIcinde = false;
  // BOM temizle
  if (metin.charCodeAt(0) === 0xfeff) metin = metin.slice(1);
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnakIcinde) {
      if (c === '"') {
        if (metin[i + 1] === '"') { alan += '"'; i++; }
        else tirnakIcinde = false;
      } else alan += c;
    } else if (c === '"') {
      tirnakIcinde = true;
    } else if (c === ",") {
      satir.push(alan); alan = "";
    } else if (c === "\n" || c === "\r") {
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

(async () => {
  // 1) CSV'yi oku
  const ham = fs.readFileSync(CSV_YOLU, "utf8");
  const [baslik, ...satirlar] = csvParse(ham);
  const kol = (ad) => baslik.findIndex((b) => normalize(b) === normalize(ad));
  const iAd = kol("Restoran Adı"), iAdres = kol("Adres"),
        iEnlem = kol("Enlem"), iBoylam = kol("Boylam"), iSorgu = kol("Sorgu");
  if (iAd < 0 || iEnlem < 0 || iBoylam < 0) {
    console.error("CSV başlıkları beklenen formatta değil:", baslik);
    process.exit(1);
  }

  // 2) Backend'deki mevcut restoranlar (idempotentlik)
  const mevcutlar = await (await fetch(`${BACKEND}/restoranlar`)).json();
  const mevcutAnahtarlar = new Set(
    mevcutlar.map((r) => normalize(r.restoranAdi))
  );
  console.log(`Backend'de şu an ${mevcutlar.length} restoran var.`);

  // 3) Satırları aktar
  let eklendi = 0, atlandi = 0, hatali = 0;
  const gorulen = new Set(); // CSV içi tekrarlar
  for (const s of satirlar) {
    const ad = (s[iAd] || "").trim();
    const enlem = parseFloat(s[iEnlem]);
    const boylam = parseFloat(s[iBoylam]);
    if (!ad || !isFinite(enlem) || !isFinite(boylam)) { hatali++; continue; }

    const anahtar = normalize(ad);
    if (mevcutAnahtarlar.has(anahtar) || gorulen.has(anahtar)) { atlandi++; continue; }
    gorulen.add(anahtar);

    const govde = {
      restoranAdi: ad.slice(0, 160),
      enlem,
      boylam,
      adres: (s[iAdres] || "").trim().slice(0, 255),
      aciklama: `Google Places taramasıyla eklendi (arama: ${(s[iSorgu] || "restoran").trim()}). Menü, QR keşfi ya da kaynak senkronuyla gelecektir.`.slice(0, 1000),
    };

    try {
      const res = await fetch(`${BACKEND}/restoranlar`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(govde),
      });
      if (res.ok) { eklendi++; }
      else { hatali++; console.warn(`  ! ${ad}: HTTP ${res.status}`); }
    } catch (e) {
      hatali++; console.warn(`  ! ${ad}: ${e.message}`);
    }
  }

  console.log(`\nBitti: ${eklendi} eklendi, ${atlandi} atlandı (zaten var/tekrar), ${hatali} hatalı satır.`);
  const son = await (await fetch(`${BACKEND}/restoranlar`)).json();
  console.log(`Backend'de artık ${son.length} restoran var.`);
})();
