/**
 * Menü verisi servisi: QR kod menü parse, backend'den restoran/menü çekme,
 * ve kullanıcı sorgusuna göre arama/filtreleme. Tamamı saf veri mantığı (UI yok).
 */
import { apiFetch, BACKEND_URL } from "./api";
import { MenuItem, Restaurant, SearchCriteria } from "./chatTypes";

// Demo referans konumu: Bursa merkez. Gerçek üründe kullanıcının GPS
// konumu (expo-location) ile değiştirilir. Demo'da öngörülebilir,
// gerçekçi mesafeler (0.3–1.5 km) için sabit tutulur.
export const DEMO_KONUM = { enlem: 40.1885, boylam: 29.061 };

/** İki koordinat arası kuş uçuşu mesafe (km) — Haversine formülü. */
export const haversineKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Dünya yarıçapı (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
  // Not: Bu yalnızca yedek yoldur. Asıl QR menü çıkarımı backend'in
  // /restoranlar/qr-kesif ucunda (güvenli, sunucu tarafı) yapılır; bu işlev
  // sadece backend'e ulaşılamadığında chatbot'un geçici analizi için çalışır.

  // 1) Önce script.js dene (dijital QR menü siteleri)
  try {
    const base = qrUrl.endsWith("/") ? qrUrl : qrUrl + "/";
    const res = await apiFetch(base + "script.js", {}, 8000);
    if (!res.ok) throw new Error(`script.js ${res.status}`);
    const js = await res.text();

    const match = js.match(/(?:const|let|var)\s+categories\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (!match) throw new Error("categories bulunamadı");

    // GÜVENLİK: eval KULLANMA — QR'dan gelen site rastgele kod çalıştırabilirdi.
    // JS dizi literalini güvenli biçimde JSON'a normalize edip parse ediyoruz.
    const jsonText = match[1]
      .replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":') // tırnaksız anahtar -> "anahtar":
      .replace(/'/g, '"') // tek tırnak -> çift tırnak
      .replace(/,(\s*[}\]])/g, "$1"); // sondaki fazlalık virgül
    const cats: any[] = JSON.parse(jsonText);

    return cats
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
  } catch {
    // script.js yok ya da güvenli ayrıştırılamadı → HTML metnine düş
  }

  // 2) Doğrudan URL'yi HTML olarak çek ve metni ayıkla
  try {
    const res = await apiFetch(qrUrl, {}, 8000);
    if (!res.ok) throw new Error(`URL ${res.status}`);
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4000);
    return `(Sayfa içeriği):\n${text}`;
  } catch {
    return "";
  }
};

/** Backend'den tüm restoranları ve her birinin menüsünü (paralel) çeker. */
/** Backend DtoMenu yanıtını uygulama Restaurant modeline çevirir. */
const menuDtoToRestaurant = (menuData: any): Restaurant | null => {
  const r = menuData?.restoran;
  if (!r?.id) return null;
  const mesafe =
    typeof r.enlem === "number" && typeof r.boylam === "number"
      ? Math.round(
          haversineKm(DEMO_KONUM.enlem, DEMO_KONUM.boylam, r.enlem, r.boylam) * 10
        ) / 10
      : undefined;
  const kategoriler = Array.isArray(menuData.kategoriler) ? menuData.kategoriler : [];
  const menuler: MenuItem[] = kategoriler.flatMap((k: any) =>
    Array.isArray(k.urunler)
      ? k.urunler.map((u: any) => ({
          urunAdi: u.urunAdi || "",
          fiyat: typeof u.fiyat === "number" ? u.fiyat : 0,
          kategori: k.kategoriAdi || "",
          aciklama: u.aciklama || "",
          etiketler: Array.isArray(u.alerjenler) ? u.alerjenler : [],
          tahminiKalori:
            typeof u.tahminiKalori === "number" ? u.tahminiKalori : undefined,
        }))
      : []
  );
  return {
    id: r.id,
    ad: r.restoranAdi || "Bilinmeyen Restoran",
    adres: r.adres || "",
    enlem: r.enlem,
    boylam: r.boylam,
    mesafe,
    menuler,
  };
};

export const fetchAllRestaurantsFromBackend = async (): Promise<Restaurant[]> => {
  // 1) Tercih edilen yol: TOPLU uç — tüm restoranlar + menüleri tek istekte.
  //    (Yüzlerce restoranda restoran başına ayrı istek atmak haritayı kilitler.)
  try {
    const res = await apiFetch(`${BACKEND_URL}/restoranlar/menuler`, {}, 12000);
    if (res.ok) {
      const menuList = await res.json();
      if (Array.isArray(menuList) && menuList.length > 0) {
        return menuList
          .map(menuDtoToRestaurant)
          .filter((x): x is Restaurant => x !== null);
      }
    }
  } catch (e) {
    console.warn("Toplu menü ucu kullanılamadı, eski yola düşülüyor:", e);
  }

  // 2) Yedek yol: eski davranış — liste + restoran başına menü isteği.
  try {
    const res = await apiFetch(`${BACKEND_URL}/restoranlar`, {}, 6000);
    if (!res.ok) throw new Error("Backend response not ok");
    const restoranList = await res.json();
    if (!Array.isArray(restoranList) || restoranList.length === 0) return [];

    // 2) Her restoran için menüyü paralel çek
    const restaurantsWithMenu = await Promise.all(
      restoranList.map(async (r: any) => {
        const baseName = r.restoranAdi || r.ad || "Bilinmeyen Restoran";
        // Referans konuma mesafe (km, 1 ondalık)
        const mesafe =
          typeof r.enlem === "number" && typeof r.boylam === "number"
            ? Math.round(
                haversineKm(DEMO_KONUM.enlem, DEMO_KONUM.boylam, r.enlem, r.boylam) * 10
              ) / 10
            : undefined;
        const temel = {
          id: r.id,
          ad: baseName,
          adres: r.adres || "",
          enlem: r.enlem,
          boylam: r.boylam,
          mesafe,
        };
        try {
          const menuRes = await apiFetch(`${BACKEND_URL}/restoranlar/${r.id}/menu`, {}, 6000);
          if (!menuRes.ok) {
            return { ...temel, menuler: [] };
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
                  tahminiKalori:
                    typeof u.tahminiKalori === "number" ? u.tahminiKalori : undefined,
                }))
              : []
          );

          return { ...temel, menuler };
        } catch (err) {
          console.warn(`Menü çekilemedi (${baseName}):`, err);
          return { ...temel, menuler: [] };
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

// Beslenme tercihiyle UYUMSUZ ürünleri tespit eden anahtar kelimeler.
// Ürün adı/açıklamasında bunlardan biri geçiyorsa o tercih için elenir.
const PREF_HARIC: Record<string, string[]> = {
  // Vegan: et/tavuk/balık + tüm süt ve süt tatlıları + yumurta/bal
  vegan: ["tavuk", "et ", "kebap", "köfte", "balık", "şiş", "adana", "urfa", "iskender", "döner", "sucuk", "kıyma", "jambon", "salam", "sosis", "peynir", "süt", "sütlaç", "sütlü", "muhallebi", "kazandibi", "keşkül", "trileçe", "supangle", "dondurma", "puding", "krema", "künefe", "baklava", "yumurta", "tereyağ", "yoğurt", "ayran", "bal"],
  vegetarian: ["tavuk", "et ", "kebap", "köfte", "balık", "şiş", "adana", "urfa", "iskender", "döner", "sucuk", "kıyma", "jambon", "salam", "sosis"],
  gluten_free: ["baklava", "künefe", "ekmek", "makarna", "pizza", "börek", "buğday", "mantı", "lahmacun", "pide"],
  lactose_intolerant: ["süt", "sütlaç", "sütlü", "muhallebi", "dondurma", "kazandibi", "keşkül", "trileçe", "supangle", "puding", "ayran", "peynir", "yoğurt", "krema", "tereyağ", "künefe"],
  peanut_allergy: ["fıstık", "fıstıklı"],
};

// İsimde bu kelime geçiyorsa tercih için KESİN uygun sayılır (eleme atlanır).
const PREF_DAHIL: Record<string, string[]> = {
  vegan: ["vegan"],
  vegetarian: ["vegan", "vejetaryen", "vejeteryan"],
  gluten_free: ["glutensiz", "glütensiz"],
};

/** Bir ürün, kullanıcının beslenme tercihlerine uygun mu? */
export const urunUygunMu = (item: MenuItem, userPrefs?: string[]): boolean => {
  if (!userPrefs || userPrefs.length === 0) return true;
  const metin = `${item.urunAdi} ${item.aciklama || ""}`.toLowerCase();
  const alerjenMetin = (item.etiketler || []).join(" ").toLowerCase();

  for (const pref of userPrefs) {
    const dahil = PREF_DAHIL[pref];
    if (dahil && dahil.some((k) => metin.includes(k))) continue; // kesin uygun
    const haric = PREF_HARIC[pref];
    if (haric && haric.some((k) => metin.includes(k) || alerjenMetin.includes(k))) {
      return false; // tercihle çelişiyor
    }
  }
  return true;
};

/**
 * Restoran listesini kriterlere ve kullanıcı tercihlerine göre filtreler;
 * fiyata göre sıralı ilk 10 ürünü döner.
 */
export const filterRestaurants = (
  restaurants: Restaurant[],
  criteria: SearchCriteria,
  userPrefs?: string[]
): MenuItem[] => {
  const results: MenuItem[] = [];

  for (const restaurant of restaurants) {
    for (const item of restaurant.menuler) {
      let matches = true;

      // Profil tercih filtresi (sıkı eleme: vegan/glutensiz/alerjen vb.)
      if (!urunUygunMu(item, userPrefs)) matches = false;

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
        results.push({
          ...item,
          kategori: restaurant.ad,
          restoranMesafe: restaurant.mesafe,
        });
      }
    }
  }

  // En ucuz öne: fiyata göre artan sırala, ilk 10 ürün
  return results.sort((a, b) => a.fiyat - b.fiyat).slice(0, 10);
};
