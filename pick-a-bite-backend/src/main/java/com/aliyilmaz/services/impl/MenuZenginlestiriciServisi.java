package com.aliyilmaz.services.impl;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aliyilmaz.entities.Urun;
import com.aliyilmaz.repository.UrunRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

/**
 * Otomatik AI menü zenginleştirme (Gereksinim md.5 — Yapay Zekâ Destekli
 * Menü Analizi). {@code enrich-menus.js} betiğinin sunucu tarafı karşılığı.
 * <p>
 * Belirli aralıklarla, bilgisi EKSİK (açıklama/kalori/alerjen yok) ya da ADI
 * ŞÜPHELİ (web kazımadan bozuk gelmiş) ürünleri bulur ve Groq'tan tahminî
 * kalori, kısa içindekiler açıklaması, olası alerjenler ve gerekiyorsa
 * düzeltilmiş ad üretir. Böylece QR keşfiyle yeni eklenen bir restoranın
 * menüsü, kullanıcı bir şey yapmadan kısa sürede kendiliğinden tamamlanır.
 * <p>
 * Groq anahtarı önce {@code GROQ_API_KEY} ortam değişkeninden, yoksa
 * frontend {@code .env} dosyasından okunur. Anahtar yoksa servis sessizce
 * devre dışı kalır (uygulama eksik bilgiyi zaten "tahminî" notuyla gösterir).
 */
@Service
public class MenuZenginlestiriciServisi {

	private static final Logger log = LoggerFactory.getLogger(MenuZenginlestiriciServisi.class);
	private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

	private static final String SISTEM_ISTEMI =
			"Türk restoran menüleri konusunda uzmansın. Verilen her ürün için TAHMİNÎ bilgiler üret. "
			+ "AD DÜZELTME: ürün adı web kazımadan bozuk gelebilir (eksik baş harf: 'zmir'->'İzmir', "
			+ "'ner'->'Döner'; yapışık tanıtım metni; birden fazla ürün/fiyat birbirine karışmış). Ad AÇIKÇA "
			+ "bozuksa kategori ve fiyata bakarak en olası HALİNE düzelt; normal görünüyorsa adDuzeltme=null "
			+ "bırak (adı asla değiştirme/uydurma). YALNIZCA şu JSON şemasıyla yanıt ver: "
			+ "{\"urunler\":[{\"id\":<sayı>,\"adDuzeltme\":<düzeltilmiş ad ya da null>,\"tahminiKalori\":"
			+ "<porsiyon başına kcal, tam sayı>,\"aciklama\":\"<en fazla 90 karakter, Türkçe, tipik içindekiler>\","
			+ "\"alerjenler\":[\"...\"]}]}. Alerjen listesi için YALNIZCA şu değerleri kullan: gluten, süt, "
			+ "yumurta, fıstık, kuruyemiş, balık, kabuklu deniz ürünleri, soya, susam, hardal. Emin değilsen boş "
			+ "bırak. Uydurma marka/iddia ekleme.";

	// enrich-menus.js'teki adSupheli ile aynı kurallar
	private static final Pattern AD_BINLIK_FIYAT = Pattern.compile("\\d[.,]\\d{3}");
	private static final Pattern AD_HARF = Pattern.compile("[A-Za-zÇĞİÖŞÜçğıöşü]");

	private final UrunRepository urunRepository;
	private final ObjectMapper objectMapper = new ObjectMapper();
	private final HttpClient http = HttpClient.newBuilder()
			.connectTimeout(Duration.ofSeconds(10)).build();

	@Value("${app.zenginlestir.aktif:true}")
	private boolean aktif;
	@Value("${app.zenginlestir.grup-boyu:15}")
	private int grupBoyu;
	@Value("${app.zenginlestir.max-grup-tur-basina:2}")
	private int maxGrupTurBasina;
	@Value("${app.zenginlestir.model:llama-3.3-70b-versatile}")
	private String model;
	@Value("${app.groq.api-key:}")
	private String apiKeyAyar;
	@Value("${app.groq.env-yolu:../pick-a-bite-main/.env}")
	private String envYolu;

	private String apiKey;
	private volatile boolean anahtarUyarisiVerildi;

	public MenuZenginlestiriciServisi(UrunRepository urunRepository) {
		this.urunRepository = urunRepository;
	}

	@Scheduled(fixedDelayString = "${app.zenginlestir.aralik-ms:120000}",
			initialDelayString = "${app.zenginlestir.baslangic-ms:30000}")
	@Transactional
	public void zenginlestir() {
		if (!aktif) {
			return;
		}
		String key = anahtarBul();
		if (key == null || key.isBlank()) {
			if (!anahtarUyarisiVerildi) {
				log.warn("AI zenginleştirme: Groq anahtarı bulunamadı "
						+ "(GROQ_API_KEY ya da {}). Servis pasif.", envYolu);
				anahtarUyarisiVerildi = true;
			}
			return;
		}

		List<Urun> eksikler = new ArrayList<>();
		for (Urun u : urunRepository.findAll()) {
			if (u.isMevcut() && bilgiEksik(u)) {
				eksikler.add(u);
				if (eksikler.size() >= grupBoyu * maxGrupTurBasina) {
					break; // yükü tura yay — kalanlar sonraki turda işlenir
				}
			}
		}
		if (eksikler.isEmpty()) {
			return;
		}
		log.info("AI zenginleştirme: {} eksik ürün işleniyor...", eksikler.size());

		int guncellenen = 0;
		for (int i = 0; i < eksikler.size(); i += grupBoyu) {
			List<Urun> grup = eksikler.subList(i, Math.min(i + grupBoyu, eksikler.size()));
			try {
				guncellenen += grubuIsle(key, grup);
			} catch (Exception e) {
				log.warn("AI zenginleştirme: grup başarısız ({}).", e.getMessage());
			}
		}
		if (guncellenen > 0) {
			log.info("AI zenginleştirme: {} ürün tamamlandı.", guncellenen);
		}
	}

	private int grubuIsle(String key, List<Urun> grup) throws IOException, InterruptedException {
		StringBuilder liste = new StringBuilder();
		for (Urun u : grup) {
			liste.append("- id:").append(u.getId())
					.append(" | ").append(u.getUrunAdi())
					.append(" | kategori: ").append(u.getKategori() != null
							? u.getKategori().getKategoriAdi() : "")
					.append(" | fiyat: ").append(u.getFiyat()).append(" TL\n");
		}

		ObjectNode govde = objectMapper.createObjectNode();
		govde.put("model", model);
		govde.put("temperature", 0.3);
		govde.putObject("response_format").put("type", "json_object");
		ArrayNode mesajlar = govde.putArray("messages");
		ObjectNode sistem = mesajlar.addObject();
		sistem.put("role", "system");
		sistem.put("content", SISTEM_ISTEMI);
		ObjectNode kullanici = mesajlar.addObject();
		kullanici.put("role", "user");
		kullanici.put("content", "Şu ürünleri zenginleştir:\n" + liste);

		HttpRequest istek = HttpRequest.newBuilder(URI.create(GROQ_URL))
				.timeout(Duration.ofSeconds(40))
				.header("Authorization", "Bearer " + key)
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(
						objectMapper.writeValueAsString(govde)))
				.build();
		HttpResponse<String> yanit = http.send(istek, HttpResponse.BodyHandlers.ofString());
		if (yanit.statusCode() / 100 != 2) {
			throw new IOException("Groq HTTP " + yanit.statusCode());
		}

		JsonNode kok = objectMapper.readTree(yanit.body());
		String icerik = kok.path("choices").path(0).path("message").path("content").asText("");
		JsonNode urunler = objectMapper.readTree(icerik).path("urunler");

		int guncellenen = 0;
		for (JsonNode s : urunler) {
			Urun u = grup.stream()
					.filter(x -> x.getId().equals(s.path("id").asInt(-1)))
					.findFirst().orElse(null);
			if (u == null) {
				continue;
			}
			guncellenen += uruneUygula(u, s) ? 1 : 0;
		}
		return guncellenen;
	}

	/** AI önerilerini ürüne uygular — yalnızca eksik alanları doldurur, sağlamı korur. */
	private boolean uruneUygula(Urun u, JsonNode s) {
		boolean degisti = false;

		// Ad: yalnızca mevcut ad şüpheliyse ve geçerli bir düzeltme geldiyse
		String adDuzeltme = s.path("adDuzeltme").isTextual()
				? s.path("adDuzeltme").asText().trim() : null;
		if (adSupheli(u.getUrunAdi()) && adDuzeltme != null
				&& adDuzeltme.length() >= 2 && !adSupheli(adDuzeltme)) {
			u.setUrunAdi(adDuzeltme.length() > 160 ? adDuzeltme.substring(0, 160) : adDuzeltme);
			degisti = true;
		}
		// Açıklama
		if ((u.getAciklama() == null || u.getAciklama().isBlank())
				&& s.path("aciklama").isTextual() && !s.path("aciklama").asText().isBlank()) {
			String a = s.path("aciklama").asText().trim();
			u.setAciklama(a.length() > 200 ? a.substring(0, 200) : a);
			degisti = true;
		}
		// Tahminî kalori
		if (u.getTahminiKalori() == null && s.path("tahminiKalori").isNumber()) {
			u.setTahminiKalori(s.path("tahminiKalori").asInt());
			degisti = true;
		}
		// Alerjenler
		if ((u.getAlerjenler() == null || u.getAlerjenler().isEmpty())
				&& s.path("alerjenler").isArray() && s.path("alerjenler").size() > 0) {
			Set<String> aller = new HashSet<>();
			for (JsonNode a : s.path("alerjenler")) {
				if (a.isTextual() && !a.asText().isBlank() && aller.size() < 5) {
					aller.add(a.asText().trim());
				}
			}
			u.setAlerjenler(aller);
			degisti = true;
		}

		if (degisti) {
			urunRepository.save(u);
		}
		return degisti;
	}

	private static boolean bilgiEksik(Urun u) {
		// Alerjen boşluğu KASITLI eksiklik değildir (alerjensiz ürün olabilir);
		// alerjen, açıklama/kalori doldurulurken zaten birlikte üretilir. Onu
		// burada kontrol etmek, alerjensiz ürünleri her turda gereksiz yere
		// tekrar AI'a gönderirdi.
		return (u.getAciklama() == null || u.getAciklama().isBlank())
				|| u.getTahminiKalori() == null
				|| adSupheli(u.getUrunAdi());
	}

	/** enrich-menus.js'teki adSupheli ile aynı kurallar. */
	private static boolean adSupheli(String ad) {
		String t = ad == null ? "" : ad.trim();
		if (t.isEmpty()) {
			return true;
		}
		char ilk = t.charAt(0);
		boolean kucukBas = Character.isLowerCase(ilk);
		return kucukBas
				|| t.length() < 3
				|| !AD_HARF.matcher(t).find()
				|| t.split("\\s+").length > 6
				|| AD_BINLIK_FIYAT.matcher(t).find();
	}

	/** Groq anahtarı: önce ayar/env, yoksa frontend .env dosyasından (bir kez). */
	private String anahtarBul() {
		if (apiKey != null) {
			return apiKey;
		}
		if (apiKeyAyar != null && !apiKeyAyar.isBlank()) {
			apiKey = apiKeyAyar.trim();
			return apiKey;
		}
		try {
			Path p = Path.of(envYolu);
			if (Files.exists(p)) {
				for (String satir : Files.readAllLines(p)) {
					String s = satir.trim();
					if (s.startsWith("GROQ_API_KEY=")) {
						apiKey = s.substring("GROQ_API_KEY=".length()).trim();
						return apiKey;
					}
				}
			}
		} catch (Exception e) {
			log.debug(".env okunamadı: {}", e.getMessage());
		}
		apiKey = ""; // bulunamadı — tekrar dosya okumasın
		return apiKey;
	}
}
