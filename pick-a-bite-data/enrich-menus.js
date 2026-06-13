/**
 * AI menü zenginleştirme (Gereksinim md.5 — Yapay Zekâ Destekli Menü Analizi):
 * "Menü içeriklerinden tahminî kalori ve alerjen bilgileri üretilir."
 *
 * Web'den toplanan ürünlerde yalnızca ad + fiyat bulunur. Bu script, açıklaması
 * ya da kalorisi EKSİK ürünler için Groq (llama-3.3-70b) ile tahminî kalori,
 * kısa içindekiler açıklaması ve OLASI alerjenleri üretip backend'e yazar.
 * Üretilen bilgiler uygulamada zaten "tahminîdir" uyarısıyla gösterilir.
 *
 * Tekrar çalıştırmak güvenlidir: yalnızca eksik alanlı ürünlere dokunur
 * (QR keşfiyle sonradan eklenen restoranlar için yeniden çalıştırılabilir).
 *
 * Kullanım: backend açıkken  ->  node enrich-menus.js
 */
const fs = require("fs");
const path = require("path");

const BACKEND = process.env.BACKEND_URL || "http://localhost:8080/pick-a-bite";
const GRUP_BOYU = 15; // istek başına ürün sayısı
const MODEL = "llama-3.3-70b-versatile";

// GROQ_API_KEY'i frontend .env dosyasından oku (repoya girmeyen dosya)
function groqKeyBul() {
  if (process.env.GROQ_API_KEY) return process.env.GROQ_API_KEY;
  const envYolu = path.join(__dirname, "..", "pick-a-bite-main", ".env");
  const satir = fs.readFileSync(envYolu, "utf8")
    .split(/\r?\n/).find((l) => l.startsWith("GROQ_API_KEY="));
  if (!satir) throw new Error(".env içinde GROQ_API_KEY bulunamadı");
  return satir.slice("GROQ_API_KEY=".length).trim();
}

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

// Web kazımadan bozuk gelmiş olabilecek ad: küçük harfle başlıyor (baş harf
// kırpılmış), çok kısa, harf içermiyor ya da aşırı uzun (ürünler birleşmiş).
const adSupheli = (ad) => {
  const t = (ad || "").trim();
  return (
    /^[a-zçğıöşü]/.test(t) ||
    t.length < 3 ||
    !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(t) ||
    t.split(/\s+/).length > 6 ||
    /\d[.,]\d{3}/.test(t) // ad içinde binlik fiyat artığı (1.475) = birleşmiş ürün
  );
};

async function groqZenginlestir(apiKey, urunler) {
  const liste = urunler
    .map((u) => `- id:${u.id} | ${u.urunAdi} | kategori: ${u.kategori} | restoran: ${u.restoran}`)
    .join("\n");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Türk restoran menüleri konusunda uzmansın. Verilen her ürün için TAHMİNÎ bilgiler üret. ' +
            'AD DÜZELTME: ürün adı web kazımadan bozuk gelebilir (eksik baş harf: "zmir"->"İzmir", "ner"->"Döner"; ' +
            'yapışık tanıtım metni; birden fazla ürün/fiyat birbirine karışmış). Ad AÇIKÇA bozuksa kategori ve fiyata ' +
            'bakarak en olası HALİNE düzelt; normal görünüyorsa adDuzeltme=null bırak (adı asla değiştirme/uydurma). ' +
            'YALNIZCA şu JSON şemasıyla yanıt ver: {"urunler":[{"id":<sayı>,"adDuzeltme":<düzeltilmiş ad ya da null>,' +
            '"tahminiKalori":<porsiyon başına kcal, tam sayı>,"aciklama":"<en fazla 90 karakter, Türkçe, tipik ' +
            'içindekileri anlatan kısa açıklama>","alerjenler":["..."]}]}. Alerjen listesi için YALNIZCA şu değerleri ' +
            'kullan: gluten, süt, yumurta, fıstık, kuruyemiş, balık, kabuklu deniz ürünleri, soya, susam, hardal. ' +
            'Ürünün tipik tarifinde bulunması MUHTEMEL alerjenleri yaz; emin değilsen boş bırak. Uydurma marka/iddia ekleme.',
        },
        { role: "user", content: `Şu ürünleri zenginleştir:\n${liste}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const veri = await res.json();
  return JSON.parse(veri.choices[0].message.content).urunler || [];
}

(async () => {
  const apiKey = groqKeyBul();

  // 1) Eksik bilgili ürünleri topla
  const menuler = await (await fetch(`${BACKEND}/restoranlar/menuler`)).json();
  const eksikler = [];
  const urunIndex = new Map(); // id -> mevcut alanlar (PUT gövdesi için)
  for (const m of menuler) {
    for (const k of m.kategoriler || []) {
      for (const u of k.urunler || []) {
        urunIndex.set(u.id, u);
        const aciklamaYok = !u.aciklama || u.aciklama.trim() === "";
        const kaloriYok = u.tahminiKalori == null;
        const adBozuk = adSupheli(u.urunAdi);
        if (aciklamaYok || kaloriYok || adBozuk) {
          eksikler.push({
            id: u.id,
            urunAdi: u.urunAdi,
            kategori: k.kategoriAdi,
            restoran: m.restoran.restoranAdi,
          });
        }
      }
    }
  }
  console.log(`Eksik bilgili ürün: ${eksikler.length} (toplam ${urunIndex.size})\n`);
  if (eksikler.length === 0) { console.log("Zenginleştirilecek ürün yok."); return; }

  // 2) Gruplar hâlinde AI'dan üret, backend'e yaz
  let yazilan = 0, hata = 0;
  for (let i = 0; i < eksikler.length; i += GRUP_BOYU) {
    const grup = eksikler.slice(i, i + GRUP_BOYU);
    process.stdout.write(`AI grubu ${Math.floor(i / GRUP_BOYU) + 1}/${Math.ceil(eksikler.length / GRUP_BOYU)} (${grup.length} ürün) ... `);
    try {
      const sonuc = await groqZenginlestir(apiKey, grup);
      let g = 0;
      for (const s of sonuc) {
        const mevcut = urunIndex.get(s.id);
        if (!mevcut) continue;
        // Adı YALNIZCA mevcut ad şüpheliyse ve AI geçerli bir düzeltme
        // önerdiyse değiştir — sağlam adlara asla dokunma.
        const adDuzeltilmis =
          adSupheli(mevcut.urunAdi) &&
          s.adDuzeltme &&
          String(s.adDuzeltme).trim().length >= 2 &&
          !adSupheli(s.adDuzeltme);
        const govde = {
          urunAdi: adDuzeltilmis
            ? String(s.adDuzeltme).trim().slice(0, 160)
            : mevcut.urunAdi,
          aciklama: (mevcut.aciklama && mevcut.aciklama.trim() !== "")
            ? mevcut.aciklama
            : String(s.aciklama || "").slice(0, 200),
          fiyat: mevcut.fiyat,
          tahminiKalori: mevcut.tahminiKalori != null
            ? mevcut.tahminiKalori
            : (Number.isFinite(s.tahminiKalori) ? Math.round(s.tahminiKalori) : null),
          alerjenler: (mevcut.alerjenler && mevcut.alerjenler.length > 0)
            ? mevcut.alerjenler
            : (Array.isArray(s.alerjenler) ? s.alerjenler.slice(0, 5) : []),
          mevcut: true,
        };
        const res = await fetch(`${BACKEND}/urunler/${s.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(govde),
        });
        if (res.ok) {
          yazilan++; g++;
          if (adDuzeltilmis) {
            console.log(`\n    ad düzeltildi: "${mevcut.urunAdi}" -> "${govde.urunAdi}"`);
          }
        } else { hata++; }
      }
      console.log(`${g} ürün güncellendi`);
    } catch (e) {
      hata += grup.length;
      console.log(`HATA: ${e.message}`);
    }
    await bekle(800); // Groq hız sınırına nazik davran
  }

  console.log(`\nBitti: ${yazilan} ürün zenginleştirildi, ${hata} hata.`);

  // 3) Örnek çıktı göster (göz kontrolü)
  const kontrol = await (await fetch(`${BACKEND}/restoranlar/menuler`)).json();
  for (const m of kontrol) {
    if (m.restoran.restoranAdi.includes("Burhan") || m.restoran.restoranAdi.includes("Yusuf")) {
      const u = (m.kategoriler?.[0]?.urunler || [])[0];
      if (u) console.log(`Örnek — ${u.urunAdi}: ~${u.tahminiKalori} kcal | ${u.aciklama} | alerjen: ${(u.alerjenler || []).join(",") || "-"}`);
    }
  }
})();
