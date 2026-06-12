/**
 * QR KEŞİF DEMOSU için sahte restoran web sitesi.
 *
 * Ekran kaydında "uygulamada olmayan restoranın QR'ını okut → restoran
 * menüsüyle birlikte eklensin" sahnesini, GERÇEK kayıtları bozmadan
 * istediğin kadar tekrarlamak için kullanılır.
 *
 * Telefon PC'ye LAN üzerinden ulaşır; bu yüzden sunucu tüm arayüzlerde
 * (0.0.0.0) dinler. QR içeriği: http://<PC-LAN-IP>:8090/
 *
 * Kullanım: node demo-restoran-sitesi.js   (ya da qr-kesif-demo.bat)
 */
const http = require("http");

const PORT = 8090;

// Uygulamadaki keşif servisi restoran adını sayfanın <title>'ından alır
const INDEX_HTML = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8">
<title>Köfteci Niyazi Usta</title></head>
<body><h1>Köfteci Niyazi Usta — Bursa</h1>
<p>1965'ten beri ızgara köfte. Dijital menümüz için QR'ı okutun.</p>
<script src="script.js"></script></body></html>`;

// Keşif servisi menüyü script.js içindeki "categories" dizisinden okur
const SCRIPT_JS = `const categories = [
  { title: 'Izgaralar', items: [
      { name: 'Porsiyon Köfte', price: 290, desc: 'El yapımı dana köfte, közlenmiş biber ve pilav ile' },
      { name: 'Yarım Ekmek Köfte', price: 180, desc: 'Izgara köfte, domates ve yeşillik ile' },
      { name: 'Kaşarlı Köfte', price: 330, desc: 'Eritilmiş kaşar peynirli ızgara köfte' },
      { name: 'Izgara Tavuk Şiş', price: 260, desc: 'Marine edilmiş tavuk şiş, bulgur pilavı ile' },
  ]},
  { title: 'Yan Lezzetler', items: [
      { name: 'Piyaz', price: 90, desc: 'Kuru fasulye, soğan ve tahin soslu' },
      { name: 'Mercimek Çorbası', price: 85, desc: 'Günlük taze mercimek çorbası' },
      { name: 'Mevsim Salata', price: 95, desc: 'Mevsim yeşillikleri, nar ekşili' },
  ]},
  { title: 'İçecek ve Tatlı', items: [
      { name: 'Ayran', price: 35, desc: 'Yayık ayranı' },
      { name: 'İrmik Helvası', price: 110, desc: 'Dövme irmik helvası, dondurma ile' },
  ]},
];`;

http
  .createServer((req, res) => {
    if (req.url.includes("script.js")) {
      res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      res.end(SCRIPT_JS);
    } else {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(INDEX_HTML);
    }
  })
  .listen(PORT, "0.0.0.0", () =>
    console.log(`Demo restoran sitesi hazır: http://0.0.0.0:${PORT}/  (Köfteci Niyazi Usta, 9 ürün)`)
  );
