/**
 * Groq API istemcisi. Çok turlu sohbet geçmişini + menü bağlamını alıp
 * llama-3.3-70b modelinden Türkçe öneri yanıtı üretir.
 */
import { MenuItem, Message } from "./chatTypes";

// API anahtarı .env'den gelir — GitHub'a YÜKLENMEZ (.gitignore içinde)
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? "";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

/** Beslenme tercihi kodu → Türkçe etiket. */
export const PREF_LABELS: Record<string, string> = {
  vegan: "Vegan",
  vegetarian: "Vejetaryen",
  gluten_free: "Glutensiz",
  lactose_intolerant: "Laktoz intoleransı",
  peanut_allergy: "Fıstık alerjisi",
  halal: "Helal",
  low_calorie: "Düşük kalori",
  high_protein: "Yüksek protein",
};

export const askGroq = async (
  history: Message[],
  restaurantName?: string,
  menuContext?: string,
  userPrefs?: string[],
  filteredResults?: MenuItem[],
  /** Veri var ama kriterlere uyan ürün bulunamadıysa true. */
  noMatch?: boolean,
  /** Kullanıcının profilde tanımladığı varsayılan bütçe (TL). */
  userButce?: string
): Promise<string> => {
  const prefText = userPrefs?.length
    ? userPrefs.map((id) => PREF_LABELS[id] || id).join(", ")
    : "Herhangi bir kısıtlama yok";

  const butceText = userButce
    ? `\nKullanıcının varsayılan bütçesi: ${userButce} TL. Kullanıcı sorgusunda farklı bir tutar belirtmediyse bu bütçeyi dikkate al ve aşma.`
    : "";

  // QR menüsü varsa sistem mesajına ekle, yoksa genel mod
  const menuSection = menuContext
    ? `\n\nMENÜ BİLGİSİ (SADECE BU MENÜYE GÖRE CEVAP VER):\n${menuContext}\n\nKESİNLİKLE UYDURMA! Menüde olmayan ürünü önerme.`
    : "";

  const systemPrompt = `Sen Pick A Bite uygulamasının akıllı restoran asistanısın.
Kullanıcı tercihleri: ${prefText}${butceText}${menuSection}

KURALLAR:
1. Sorguyu analiz et ve kesin önerileri ver
2. Fiyat belirtilmişse o fiyat sınırını aşma
3. Sadece menüde olan ürünleri göster, asla uydurma
4. Türkçe, kısa, net cevap ver
5. Menü bilgisi verildiyse YALNIZCA o menüdeki ürünleri öner

KALORİ VE ALERJEN:
- Sistem ürün yanında kalori (kcal) ve alerjen bilgisi verebilir. Bu değerler
  TAHMİNÎDİR: kalori yazarken "~450 kcal" biçiminde yaklaşık işareti kullan ve
  bunları asla kesin sağlık/beslenme tavsiyesi gibi sunma.
- "Düşük kalori / hafif / diyet" sorgularında düşük kalorili ürünleri öne çıkar
  ve kalori değerlerini belirt.
- Kullanıcının alerjisi/tercihi varsa, alerjen içeren ürünlerde mutlaka uyar.
- Kullanıcının hassasiyeti (glutensiz, laktoz intoleransı, fıstık alerjisi) varsa,
  cevabın EN SONUNA şu güvenlik notunu ekle:
  "⚠️ Ciddi hassasiyet durumunda sipariş öncesi işletmeden doğrulama yapmanız önerilir."
  (Bu notu yalnızca ilgili hassasiyet varsa ekle.)

UYGUN ÜRÜN BULUNAMAZSA:
- Sistem "uygun ürün bulunamadı" derse uydurma. Durumu nazikçe açıkla ve
  kullanıcıya kriterlerini gevşetmesini öner (bütçe, kategori veya tercih).

${
  menuContext
    ? `EN ÖNEMLİ KURAL — KATEGORİYE GÖRE GRUPLA (tek restoran modu):
Tek bir restoranın menüsündesin; önerileri ASLA düz liste verme.
Ürünleri menü kategorilerine göre grupla (Yemekler, Tatlılar, İçecekler
gibi); kategori adını başlık yap, altında ürünleri FİYATI ARTAN sırada
listele. En ucuz uygun seçeneği 💰 ile EN BAŞTA tek cümleyle öne çıkar.

ÖRNEK ÇIKTI FORMATI:
💰 En uygun seçenek: Ayran — ₺35

🍽️ Yemekler
   • Yarım Ekmek Döner — ₺235
   • Dürüm Döner — ₺235
   • Porsiyon Döner — ₺325

🥤 İçecekler
   • Ayran — ₺35`
    : `EN ÖNEMLİ KURAL — RESTORANA GÖRE GRUPLA:
Kullanıcı hangi restorana gideceğini bilmek ister. Bu yüzden önerileri
DÜZ LİSTE olarak verme. Her zaman restorana göre grupla: önce restoran
adını + mesafesini başlık yap, altına o restorandaki uygun ürünleri ve
fiyatlarını yaz.

MESAFE VE FİYAT:
- Restoran başlığında mesafeyi göster (sistem "X km" verir, onu kullan).
- En ucuz seçeneği bir cümleyle EN BAŞTA öne çıkar (💰 işareti ile).
- Restoranları en uygun/en yakın olandan başlayarak sırala (sistem zaten
  fiyat sırasına göre veriyor, bu sırayı koru).

ÖRNEK ÇIKTI FORMATI:
💰 En uygun seçenek: Meyve Tabağı — ₺60 (Lezzet Durağı, 0.5 km)

📍 Lezzet Durağı (0.5 km)
   • Meyve Tabağı — ₺60
   • Dondurma — ₺75

📍 Tatlıcı Safa (0.4 km)
   • Fırın Sütlaç — ₺80
   • Kazandibi — ₺90

Her ürünün hangi restoranda olduğu net görünmeli. Aynı ürün birden çok
restoranda varsa hepsini ayrı ayrı göster ki kullanıcı en uygun yeri seçsin.`
}`;

  // Groq API için messages formatı
  const messages: any[] = [{ role: "system", content: systemPrompt }];

  // Konuşma geçmişini ekle
  for (const msg of history) {
    if (msg.id === "welcome") continue;
    messages.push({ role: msg.role === "user" ? "user" : "assistant", content: msg.text });
  }

  // Son kullanıcı mesajına menü bilgisini ekle
  if (messages.length > 1 && messages[messages.length - 1].role === "user") {
    let menuInfo = "";
    if (filteredResults && filteredResults.length > 0) {
      // Backend'den gelen filtrelenmiş sonuçlar
      menuInfo = `\n\n[SİSTEM: ${filteredResults.length} eşleşen ürün bulundu]\n`;
      const grouped: Record<string, MenuItem[]> = {};
      for (const item of filteredResults) {
        if (!grouped[item.kategori]) grouped[item.kategori] = [];
        grouped[item.kategori].push(item);
      }
      for (const [rest, items] of Object.entries(grouped)) {
        const mesafe = items[0]?.restoranMesafe;
        const mesafeStr = mesafe != null ? ` (${mesafe} km)` : "";
        menuInfo += `${rest}${mesafeStr}:\n`;
        menuInfo += items
          .map((i) => {
            const kal = i.tahminiKalori != null ? `, ${i.tahminiKalori} kcal` : "";
            const alerj =
              i.etiketler && i.etiketler.length > 0
                ? ` [alerjen: ${i.etiketler.join(", ")}]`
                : "";
            return `• ${i.urunAdi}: ₺${i.fiyat}${kal}${alerj}`;
          })
          .join("\n") + "\n";
      }
    } else if (noMatch) {
      // Veri var ama kriterlere uyan ürün yok → kriter gevşetme önerisi
      menuInfo = `\n\n[SİSTEM: Belirtilen kriterlere TAM uyan ürün bulunamadı. Kullanıcıya bunu nazikçe bildir ve kriterlerini gevşetmesini öner (ör. bütçeyi biraz artırma, farklı bir kategori deneme, beslenme tercihi filtresini gözden geçirme). Menüde yakın alternatifler varsa kibarca sun.]`;
    } else if (menuContext && menuContext.length > 0) {
      // QR modunda: menü zaten system prompt'ta var, sadece hatırlatma ekle
      menuInfo = `\n\n[Lütfen yalnızca yukarıdaki menüdeki ürünleri kullanarak cevap ver.]`;
    }
    messages[messages.length - 1].content += menuInfo;
  }

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 400,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Groq hata:", res.status, errorText);

      if (res.status === 429) {
        return "⏳ Çok hızlı istek. Biraz bekleyip tekrar deneyin.";
      }
      if (res.status === 401 || res.status === 403) {
        return "🔑 API anahtarı geçersiz. Lütfen .env kontrol edin.";
      }
      return `⚠️ API Hata ${res.status}. Biraz sonra tekrar deneyin.`;
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content;

    if (!answer) {
      console.warn("Groq boş cevap:", JSON.stringify(data));
      return "AI yanıt veremedi. Lütfen tekrar deneyin.";
    }
    return answer;
  } catch (e: any) {
    console.error("Fetch hatası:", e.message);
    return "🔌 Bağlantı hatası. İnternet kontrol edin.";
  }
};
