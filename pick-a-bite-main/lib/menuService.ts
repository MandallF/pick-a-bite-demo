/**
 * Menü verisi servisi: QR kod menü parse, backend'den restoran/menü çekme,
 * ve kullanıcı sorgusuna göre arama/filtreleme. Tamamı saf veri mantığı (UI yok).
 */
import { apiFetch, BACKEND_URL } from "./api";
import { MenuItem, Restaurant, SearchCriteria } from "./chatTypes";

/** QR URL'sinden okunabilir restoran adı çıkarır. */
export const extractName = (qr: string): string => {
  try {
    const url = new URL(qr);
    const p = url.pathname.split("/").filter(Boolean);
    const raw = p[p.length - 1] || url.hostname;
    return raw.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return qr.trim();
  }
};

/**
 * QR URL'sinden menü metni çeker.
 * Önce sayfanın script.js'indeki `categories` dizisini dener,
 * başarısız olursa sayfayı HTML olarak çekip düz metne çevirir.
 */
export const fetchMenuFromQrUrl = async (qrUrl: string): Promise<string> => {
  // 1) Önce script.js dene
  try {
    const base = qrUrl.endsWith("/") ? qrUrl : qrUrl + "/";
    const jsUrl = base + "script.js";
    console.log("[QR] script.js deneniyor:", jsUrl);
    const res = await apiFetch(jsUrl, {}, 8000);
    if (!res.ok) throw new Error(`script.js ${res.status}`);
    const js = await res.text();
    console.log("[QR] script.js alındı, boyut:", js.length);

    // Hem tek satır hem çok satır array'i yakala
    const match = js.match(/(?:const|let|var)\s+categories\s*=\s*(\[[\s\S]*?\]\s*;)/);
    if (!match) throw new Error("categories değişkeni bulunamadı");

    // eslint-disable-next-line no-eval
    const cats: any[] = eval(match[1]);
    console.log("[QR] Kategori sayısı:", cats.length);
    const result = cats
      .map((cat) => {
        const items = (cat.items || [])
          .map(
            (i: any) =>
              `  - ${i.name || i.urunAdi || ""}: ${i.price ?? i.fiyat ?? "?"} TL${i.tag ? " [" + i.tag + "]" : ""} — ${i.desc || i.aciklama || ""}`
          )
          .join("\n");
        return `${cat.title || cat.kategoriAdi || "Kategori"}:\n${items}`;
      })
      .join("\n\n");
    console.log("[QR] Menü metni oluşturuldu, karakter:", result.length);
    return result;
  } catch (e: any) {
    console.warn("[QR] script.js başarısız:", e.message, "→ HTML fallback deneniyor");
  }

  // 2) Doğrudan URL'yi HTML olarak çek
  try {
    const res = await apiFetch(qrUrl, {}, 8000);
    if (!res.ok) throw new Error(`URL ${res.status}`);
    const html = await res.text();
    console.log("[QR] HTML alındı, boyut:", html.length);
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
    console.log("[QR] HTML metni çıkarıldı, karakter:", text.length);
    return `(Sayfa içeriği):\n${text}`;
  } catch (e2: any) {
    console.error("[QR] HTML fallback da başarısız:", e2.message);
    return "";
  }
};

/** Backend'den tüm restoranları ve her birinin menüsünü (paralel) çeker. */
export const fetchAllRestaurantsFromBackend = async (): Promise<Restaurant[]> => {
  try {
    // 1) Restoran listesini al
    const res = await apiFetch(`${BACKEND_URL}/restoranlar`, {}, 6000);
    if (!res.ok) throw new Error("Backend response not ok");
    const restoranList = await res.json();
    if (!Array.isArray(restoranList) || restoranList.length === 0) return [];

    // 2) Her restoran için menüyü paralel çek
    const restaurantsWithMenu = await Promise.all(
      restoranList.map(async (r: any) => {
        const baseName = r.restoranAdi || r.ad || "Bilinmeyen Restoran";
        try {
          const menuRes = await apiFetch(`${BACKEND_URL}/restoranlar/${r.id}/menu`, {}, 6000);
          if (!menuRes.ok) {
            return { ad: baseName, adres: r.adres || "", menuler: [] };
          }
          const menuData = await menuRes.json();
          const kategoriler = Array.isArray(menuData.kategoriler) ? menuData.kategoriler : [];

          const menuler: MenuItem[] = kategoriler.flatMap((k: any) =>
            Array.isArray(k.urunler)
              ? k.urunler.map((u: any) => ({
                  urunAdi: u.urunAdi || "",
                  fiyat: typeof u.fiyat === "number" ? u.fiyat : 0,
                  kategori: k.kategoriAdi || "",
                  aciklama: u.aciklama || "",
                  etiketler: Array.isArray(u.alerjenler) ? u.alerjenler : [],
                }))
              : []
          );

          return { ad: baseName, adres: r.adres || "", menuler };
        } catch (err) {
          console.warn(`Menü çekilemedi (${baseName}):`, err);
          return { ad: baseName, adres: r.adres || "", menuler: [] };
        }
      })
    );

    return restaurantsWithMenu;
  } catch (e) {
    console.warn("Backend'e ulaşılamadı:", e);
    return [];
  }
};

/** Kullanıcı sorgusundan fiyat, kategori ve anahtar kelime kriterleri çıkarır. */
export const extractSearchCriteria = (query: string): SearchCriteria => {
  const criteria: SearchCriteria = { keywords: [], categories: [], preferences: [] };

  // Fiyat aralığı çıkar: "200 TL altı", "100-300 TL" vs
  const priceMatch = query.match(/(\d+)\s*(?:tl|₺|tlaltı|altı)/gi);
  if (priceMatch) {
    criteria.maxPrice = parseInt(priceMatch[0]);
  }

  // Kategori anahtar kelimeleri
  const categoryKeywords: Record<string, string[]> = {
    tatlı: ["tatlı", "dessert", "pasta", "kek"],
    hamburger: ["hamburger", "burger"],
    salata: ["salata", "salad"],
    çorba: ["çorba", "soup"],
    pilaş: ["pilaş", "pilav"],
    döner: ["döner", "kebab"],
    pizza: ["pizza"],
    köfte: ["köfte", "meatball"],
  };

  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((k) => query.toLowerCase().includes(k))) {
      criteria.categories?.push(cat);
    }
  }

  // Diğer anahtar kelimeleri yakala — soru/dolgu kelimelerini ele (stopwords)
  const STOPWORDS = [
    "altı", "altında", "altinda", "üstü", "ustu", "üzeri", "uzeri",
    "tl", "₺", "veya", "ile", "için", "icin", "bir", "bana", "için",
    "öner", "oner", "önerir", "istiyorum", "ister", "var", "yok",
    "nedir", "neler", "hangi", "kadar", "arası", "arasi", "ne", "mi",
    "misin", "lütfen", "lutfen", "yemek", "yiyecek",
  ];
  const words = query.toLowerCase().split(/\s+/);
  criteria.keywords = words.filter(
    (w) => w.length > 3 && !STOPWORDS.includes(w)
  );

  return criteria;
};

/** Restoran listesini kriterlere göre filtreler; fiyata göre sıralı ilk 10 ürünü döner. */
export const filterRestaurants = (
  restaurants: Restaurant[],
  criteria: SearchCriteria
): MenuItem[] => {
  const results: MenuItem[] = [];

  for (const restaurant of restaurants) {
    for (const item of restaurant.menuler) {
      let matches = true;

      // Fiyat filtresi
      if (criteria.maxPrice && item.fiyat > criteria.maxPrice) {
        matches = false;
      }

      // Kategori filtresi
      if (criteria.categories && criteria.categories.length > 0) {
        const itemCat = item.kategori.toLowerCase();
        const itemName = item.urunAdi.toLowerCase();
        const matched = criteria.categories.some(
          (cat) => itemCat.includes(cat) || itemName.includes(cat)
        );
        if (!matched) matches = false;
      }

      // Anahtar kelime filtresi (tüm kelimeler yer almalı)
      if (criteria.keywords && criteria.keywords.length > 0) {
        const itemText = (item.urunAdi + " " + item.kategori).toLowerCase();
        const allMatched = criteria.keywords.every((kw) => itemText.includes(kw));
        if (!allMatched) matches = false;
      }

      if (matches) {
        results.push({ ...item, kategori: restaurant.ad });
      }
    }
  }

  return results.sort((a, b) => a.fiyat - b.fiyat).slice(0, 10);
};
