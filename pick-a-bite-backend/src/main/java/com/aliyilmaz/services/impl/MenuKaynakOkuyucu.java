package com.aliyilmaz.services.impl;

import java.math.BigDecimal;
import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.aliyilmaz.exception.BusinessException;
import com.aliyilmaz.services.impl.MenuSenkronServisi.KaynakKategori;
import com.aliyilmaz.services.impl.MenuSenkronServisi.KaynakUrun;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Bir web menü adresinden (QR'daki URL) yapılandırılmış menü çıkarır.
 * <p>
 * Mobil taraftaki {@code fetchMenuFromQrUrl} ile aynı sözleşme, sunucu
 * tarafında: önce sayfanın {@code script.js} dosyasındaki
 * {@code categories = [...]} dizisi denenir (dijital QR menü siteleri);
 * bulunamazsa sayfa metninden "ürün — fiyat TL" kalıpları ayıklanır.
 * Çıkarılan menü kalıcı kayda ve otomatik senkrona girer.
 */
@Service
public class MenuKaynakOkuyucu {

	private static final Logger log = LoggerFactory.getLogger(MenuKaynakOkuyucu.class);

	private static final int MAKS_GOVDE = 1_500_000; // 1.5 MB üst sınır
	private static final int MAKS_URUN = 80;

	private static final Pattern CATEGORIES_DESENI = Pattern
			.compile("(?:const|let|var)\\s+categories\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*;");
	// "Adana Dürüm 250 TL" / "Künefe 145,50 ₺" / "Kuzu Döner 750gr 1.475 TL"
	// Fiyat: binlik noktalı (1.475) ya da düz (985), opsiyonel virgüllü kuruş.
	private static final Pattern METIN_URUN_DESENI = Pattern.compile(
			"([A-Za-zÇĞİÖŞÜçğıöşü][A-Za-zÇĞİÖŞÜçğıöşü0-9 \\-'&.()]{2,60}?)[\\s.·:]{1,12}(\\d{1,3}(?:\\.\\d{3})+|\\d{1,5})(?:,(\\d{1,2}))?\\s*(?:TL|tl|₺)");

	// Türk restoran menülerinde yaygın bölüm başlıkları: sayfa metninde ürün
	// adının önüne yapışırlar ("Tatlı Çeşitleri Dondurma 100 TL") — önek
	// addan ayrılır ve gerçek kategori olarak kullanılır.
	private static final Pattern BOLUM_ONEKI = Pattern.compile(
			"^(Kilo Üstü Balıklar|Deniz Mezeleri|Meze Çeşitleri|Tatlı Çeşitleri|Izgara Çeşitleri|"
					+ "Salata Çeşitleri|Tava Çeşitleri|Çorba Çeşitleri|Ara Sıcaklar|İçecekler|"
					+ "Içecekler|Kavurma|Izgaralar|Salatalar|Tatlılar|Mezeler|Çorbalar|Kebaplar|"
					+ "Pideler|Dürümler|Burgerler|Kahvaltılıklar|Yan Lezzetler|Ana Yemekler)\\s+(.+)$");

	// "eti gururla sunuyoruz ÜRÜNLERİMİZ Kuzu Döner..." gibi yapışan tanıtım
	// metni: TAMAMI BÜYÜK başlık kelimesinden sonrasını ürün adı say.
	private static final Pattern BUYUK_BASLIK = Pattern.compile(
			".*\\b([A-ZÇĞİÖŞÜ]{6,})\\b\\s+(.{3,})$");

	// Ada gömülü binlik fiyat artığı (TL'siz "1.475"): iki ürün yapışmış demek.
	private static final Pattern GOMULU_FIYAT = Pattern.compile("\\d[.,]\\d{3}\\s+(.+)$");

	/**
	 * Üretimde false yapılmalı: yerel/özel ağ adreslerine istek (SSRF) engellenir.
	 * Demo, yerel test sitesiyle çalışabilsin diye varsayılan açık.
	 */
	@Value("${app.qr-kesif.yerel-izin:true}")
	private boolean yerelIzin;

	private final ObjectMapper lenientMapper;
	private final HttpClient http;

	public MenuKaynakOkuyucu() {
		this.lenientMapper = new ObjectMapper()
				.configure(JsonParser.Feature.ALLOW_SINGLE_QUOTES, true)
				.configure(JsonParser.Feature.ALLOW_UNQUOTED_FIELD_NAMES, true)
				.configure(JsonParser.Feature.ALLOW_TRAILING_COMMA, true)
				.configure(JsonParser.Feature.ALLOW_COMMENTS, true);
		this.http = HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(6))
				.followRedirects(HttpClient.Redirect.NORMAL)
				.build();
	}

	/**
	 * Verilen menü adresinden kategorileri çıkarır.
	 *
	 * @throws BusinessException adres geçersizse ya da menü çıkarılamadıysa
	 */
	public List<KaynakKategori> urlMenuOku(String url) {
		URI uri = dogrula(url);

		// 1) script.js içindeki categories dizisi (yapılandırılmış kaynak)
		try {
			String base = url.endsWith("/") ? url : url + "/";
			String js = govdeGetir(URI.create(base + "script.js"));
			Matcher m = CATEGORIES_DESENI.matcher(js);
			if (m.find()) {
				List<KaynakKategori> sonuc = categoriesParse(m.group(1));
				if (!sonuc.isEmpty()) {
					log.info("QR keşif: '{}' script.js'ten {} kategori çıkarıldı.", uri.getHost(), sonuc.size());
					return sonuc;
				}
			}
		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.info("QR keşif: script.js okunamadı ({}), HTML yedeğine geçiliyor.", e.getMessage());
		}

		// 2) Yedek: sayfa metninden "ürün fiyat TL" kalıpları
		try {
			String html = govdeGetir(uri);
			List<KaynakKategori> sonuc = metindenParse(html);
			if (!sonuc.isEmpty()) {
				log.info("QR keşif: '{}' sayfa metninden {} ürün çıkarıldı.", uri.getHost(),
						sonuc.get(0).urunler.size());
				return sonuc;
			}
		} catch (BusinessException e) {
			throw e;
		} catch (Exception e) {
			log.warn("QR keşif: sayfa okunamadı: {}", e.getMessage());
		}

		throw new BusinessException(
				"Bu adresten menü çıkarılamadı. Sayfa bir dijital menü içermiyor olabilir.");
	}

	/**
	 * Sayfanın {@code <title>} değerini döner (restoran adı tahmini için).
	 * Erişilemezse ya da başlık yoksa null — çağıran taraf alan adına düşer.
	 */
	public String sayfaBasligi(String url) {
		try {
			URI uri = dogrula(url);
			String html = govdeGetir(uri);
			Matcher m = Pattern.compile("<title[^>]*>([^<]{2,120})</title>",
					Pattern.CASE_INSENSITIVE).matcher(html);
			if (m.find()) {
				String baslik = m.group(1)
						.replace("&amp;", "&").replace("&quot;", "\"")
						.replace("&#39;", "'").replace("&nbsp;", " ")
						.trim();
				// "Ad | Menü" / "Ad - Anasayfa" gibi eklerin ilk parçasını al
				baslik = baslik.split("\\s*[|•]\\s*")[0].trim();
				if (!baslik.isBlank()) {
					return baslik.length() > 80 ? baslik.substring(0, 80) : baslik;
				}
			}
		} catch (Exception e) {
			log.debug("Sayfa başlığı alınamadı: {}", e.getMessage());
		}
		return null;
	}

	// ── HTTP + güvenlik ──────────────────────────────────────────

	private URI dogrula(String url) {
		URI uri;
		try {
			uri = URI.create(url.trim());
		} catch (Exception e) {
			throw new BusinessException("Geçersiz menü adresi.");
		}
		String scheme = uri.getScheme();
		if (scheme == null || !(scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"))) {
			throw new BusinessException("Yalnızca http/https menü adresleri desteklenir.");
		}
		if (uri.getHost() == null) {
			throw new BusinessException("Geçersiz menü adresi.");
		}
		if (!yerelIzin) {
			try {
				InetAddress adres = InetAddress.getByName(uri.getHost());
				if (adres.isLoopbackAddress() || adres.isSiteLocalAddress()
						|| adres.isLinkLocalAddress() || adres.isAnyLocalAddress()) {
					throw new BusinessException("Yerel ağ adreslerine erişime izin verilmiyor.");
				}
			} catch (BusinessException e) {
				throw e;
			} catch (Exception e) {
				throw new BusinessException("Menü adresi çözümlenemedi.");
			}
		}
		return uri;
	}

	private String govdeGetir(URI uri) throws Exception {
		HttpRequest istek = HttpRequest.newBuilder(uri)
				.timeout(Duration.ofSeconds(8))
				.header("User-Agent", "PickABite/1.0 MenuSync")
				.GET()
				.build();
		HttpResponse<String> yanit = http.send(istek, HttpResponse.BodyHandlers.ofString());
		if (yanit.statusCode() / 100 != 2) {
			throw new IllegalStateException("HTTP " + yanit.statusCode());
		}
		String govde = yanit.body();
		if (govde.length() > MAKS_GOVDE) {
			govde = govde.substring(0, MAKS_GOVDE);
		}
		// Ayrışık unicode'u (İ = I + nokta) tek karaktere indir — tüm
		// ayrıştırma yolları (script.js, HTML metni, sayfa başlığı) düzgün
		// Türkçe karakter görsün.
		return java.text.Normalizer.normalize(govde, java.text.Normalizer.Form.NFC);
	}

	// ── Ayrıştırma ───────────────────────────────────────────────

	private List<KaynakKategori> categoriesParse(String jsDizi) throws Exception {
		JsonNode kok = lenientMapper.readTree(jsDizi);
		List<KaynakKategori> kategoriler = new ArrayList<>();
		if (!kok.isArray()) {
			return kategoriler;
		}
		for (JsonNode kat : kok) {
			KaynakKategori kk = new KaynakKategori();
			kk.kategoriAdi = ilkDolu(kat, "title", "kategoriAdi", "name");
			if (kk.kategoriAdi == null) {
				kk.kategoriAdi = "Menü";
			}
			kk.urunler = new ArrayList<>();
			JsonNode items = kat.has("items") ? kat.get("items") : kat.get("urunler");
			if (items != null && items.isArray()) {
				for (JsonNode item : items) {
					KaynakUrun ku = new KaynakUrun();
					ku.urunAdi = ilkDolu(item, "name", "urunAdi", "ad");
					if (ku.urunAdi == null || ku.urunAdi.isBlank()) {
						continue;
					}
					ku.aciklama = ilkDolu(item, "desc", "aciklama", "description");
					ku.fiyat = fiyatOku(item);
					kk.urunler.add(ku);
				}
			}
			if (!kk.urunler.isEmpty()) {
				kategoriler.add(kk);
			}
		}
		return kategoriler;
	}

	private List<KaynakKategori> metindenParse(String html) {
		// NFC normalizasyonu kritik: bazı siteler "İ/Ö/ğ" harflerini ayrışık
		// (harf + birleşen aksan) kodlar; normalize edilmezse regex harfi
		// tanımaz ve adların başı kırpılır ("İzmir" -> "zmir", "Döner" -> "ner").
		String metin = java.text.Normalizer
				.normalize(html, java.text.Normalizer.Form.NFC)
				// <head> (title/meta) komple atılır — yoksa sayfa başlığı ilk
				// ürünün adına yapışır ("Site Adı Izgaralar Kuzu Döner").
				.replaceAll("(?is)<head.*?</head>", " ")
				.replaceAll("(?is)<script.*?</script>", " ")
				.replaceAll("(?is)<style.*?</style>", " ")
				.replaceAll("<[^>]+>", " ")
				.replaceAll("&nbsp;", " ")
				.replaceAll("\\s+", " ");

		// Bölüm başlıkları gerçek kategorilere dönüşür; eşleşmeyenler "Menü"de
		java.util.LinkedHashMap<String, KaynakKategori> kategoriler = new java.util.LinkedHashMap<>();
		java.util.Set<String> gorulenAdlar = new java.util.HashSet<>();
		int toplam = 0;

		Matcher m = METIN_URUN_DESENI.matcher(metin);
		while (m.find() && toplam < MAKS_URUN) {
			String ad = adTemizle(m.group(1));
			if (ad == null) {
				continue;
			}
			String kategori = "Menü";
			Matcher bolum = BOLUM_ONEKI.matcher(ad);
			if (bolum.matches() && bolum.group(2).trim().length() >= 3) {
				kategori = bolum.group(1).trim();
				ad = bolum.group(2).trim();
			}

			// Binlik nokta kaldır (1.475 -> 1475), virgül kuruş ekle (145,50)
			BigDecimal fiyat = new BigDecimal(
					m.group(2).replace(".", "") + (m.group(3) != null ? "." + m.group(3) : ""));
			if (fiyat.compareTo(BigDecimal.ZERO) <= 0) {
				continue;
			}
			String anahtar = (kategori + "|" + ad).toLowerCase();
			if (!gorulenAdlar.add(anahtar)) {
				continue; // sayfa tekrarları
			}

			KaynakUrun ku = new KaynakUrun();
			ku.urunAdi = ad;
			ku.fiyat = fiyat;
			kategoriler.computeIfAbsent(kategori, k -> {
				KaynakKategori kk = new KaynakKategori();
				kk.kategoriAdi = k;
				kk.urunler = new ArrayList<>();
				return kk;
			}).urunler.add(ku);
			toplam++;
		}

		// Kalite eşiği: metin yedeği toplamda en az 3 ürün bulamadıysa menü
		// SAYILMAZ — tek tük "... 100 TL" eşleşmesi sahte menü üretmesin.
		return toplam >= 3 ? new ArrayList<>(kategoriler.values()) : new ArrayList<>();
	}

	/**
	 * Sayfa akışından yapışan tanıtım/başlık artıklarını üründen ayıklar.
	 * Null dönerse ürün atlanır.
	 */
	private static String adTemizle(String ham) {
		String ad = ham.trim();
		// Ada gömülü binlik fiyat (ör. "...750gr 1.475 Kuzu Döner 1000gr"): iki
		// ürün tek satıra yapışmış, satırın TL'li fiyatı SON ürüne ait. Gömülü
		// fiyattan SONRASINI ürün adı say ("Kuzu Döner 1000gr"). Birden çok
		// gömülü fiyat varsa SONUNCUSUNDAN sonrasını al.
		Matcher gomulu = GOMULU_FIYAT.matcher(ad);
		String sonParca = null;
		while (gomulu.find()) {
			sonParca = gomulu.group(1).trim();
		}
		if (sonParca != null && sonParca.length() >= 3) {
			ad = sonParca;
		}
		// "... ÜRÜNLERİMİZ Kuzu Döner" gibi: tamamı büyük başlıktan sonrasını al
		Matcher baslik = BUYUK_BASLIK.matcher(ad);
		if (baslik.matches()) {
			ad = baslik.group(2).trim();
		}
		// Küçük harfle başlayan kırpıntı/tanıtım kelimelerini at; ad ilk
		// büyük harfli kelimeden başlasın ("eti gururla sunuyoruz Kuzu..." -> "Kuzu...")
		while (!ad.isEmpty() && Character.isLowerCase(ad.charAt(0))) {
			int bosluk = ad.indexOf(' ');
			if (bosluk < 0) {
				return null; // tamamen kırpıntı
			}
			ad = ad.substring(bosluk + 1).trim();
		}
		// Çok kısa ya da harf içermeyen kalıntılar ürün değildir
		if (ad.length() < 3 || !ad.chars().anyMatch(Character::isLetter)) {
			return null;
		}
		return ad;
	}

	private static String ilkDolu(JsonNode node, String... alanlar) {
		for (String alan : alanlar) {
			JsonNode v = node.get(alan);
			if (v != null && !v.isNull() && !v.asText().isBlank()) {
				return v.asText().trim();
			}
		}
		return null;
	}

	private static BigDecimal fiyatOku(JsonNode item) {
		for (String alan : new String[] { "price", "fiyat" }) {
			JsonNode v = item.get(alan);
			if (v == null || v.isNull()) {
				continue;
			}
			try {
				return new BigDecimal(v.asText().replace("₺", "").replace("TL", "")
						.trim().replace(",", "."));
			} catch (NumberFormatException ignored) {
			}
		}
		return BigDecimal.ZERO;
	}
}
