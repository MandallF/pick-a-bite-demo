package com.aliyilmaz.services.impl;

import java.io.File;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aliyilmaz.entities.Kategori;
import com.aliyilmaz.entities.Restoran;
import com.aliyilmaz.entities.Urun;
import com.aliyilmaz.repository.AppRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Otomatik menü senkronizasyonu (Gereksinim md.9 — Veri Toplama ve Menü
 * Güncelliği).
 * <p>
 * Restoranların dijital menü kaynağı ({@code menu-kaynak.json}) belirli
 * aralıklarla okunur ve veritabanı ile karşılaştırılır:
 * <ul>
 * <li>fiyat / açıklama / kalori / alerjen değişen ürünler güncellenir,</li>
 * <li>kaynağa yeni eklenen ürünler veritabanına eklenir,</li>
 * <li>kaynaktan kaldırılan ürünler {@code mevcut=false} ile menüden
 * düşürülür (geri gelirse tekrar açılır).</li>
 * </ul>
 * Böylece restoran menüsünde yapılan bir değişiklik, kullanıcı uygulamayı
 * yeniden açtığında otomatik olarak görünür — elle veri tabanı müdahalesi
 * gerekmez. Gerçek üretimde kaynak; restoran web sitesi, Google Places veya
 * işletme menü API'si olur; demo'da aynı sözleşmeyi dosya temsil eder.
 */
@Service
public class MenuSenkronServisi {

	private static final Logger log = LoggerFactory.getLogger(MenuSenkronServisi.class);

	private final AppRepository appRepository;
	private final ObjectMapper objectMapper;
	private final MenuKaynakOkuyucu menuKaynakOkuyucu;

	@Value("${app.menu.senkron.kaynak:./menu-kaynak.json}")
	private String kaynakYolu;

	/**
	 * URL kaynakları (gerçek web siteleri) dosya kaynağından DAHA SEYREK
	 * taranır — dış sitelere her dakika istek atmak hem yavaş hem kaba olur.
	 */
	@Value("${app.menu.senkron.url-aralik-ms:3600000}")
	private long urlAralikMs;

	// Durum bilgisi — /senkron/durum ucundan okunur
	private volatile LocalDateTime sonCalisma;
	private volatile int sonDegisiklik;
	private volatile long toplamCalisma;
	private volatile String sonHata;
	private volatile long sonUrlSenkronMs;

	public MenuSenkronServisi(AppRepository appRepository, ObjectMapper objectMapper,
			MenuKaynakOkuyucu menuKaynakOkuyucu) {
		this.appRepository = appRepository;
		this.objectMapper = objectMapper;
		this.menuKaynakOkuyucu = menuKaynakOkuyucu;
	}

	@Scheduled(fixedDelayString = "${app.menu.senkron.aralik-ms:60000}", initialDelayString = "${app.menu.senkron.baslangic-ms:15000}")
	@Transactional
	public void senkronla() {
		File kaynak = new File(kaynakYolu);
		sonCalisma = LocalDateTime.now();
		toplamCalisma++;

		if (!kaynak.exists()) {
			sonHata = "Kaynak dosya bulunamadı: " + kaynak.getAbsolutePath();
			log.warn("Menü senkron: {}", sonHata);
			return;
		}

		try {
			KaynakMenu menu = objectMapper.readValue(kaynak, KaynakMenu.class);
			int degisiklik = 0;
			for (KaynakRestoran kr : guvenli(menu.restoranlar)) {
				degisiklik += restoranSenkronla(kr);
			}
			if (System.currentTimeMillis() - sonUrlSenkronMs >= urlAralikMs) {
				degisiklik += urlKaynaklariSenkronla();
				sonUrlSenkronMs = System.currentTimeMillis();
			}
			sonDegisiklik = degisiklik;
			sonHata = null;
			if (degisiklik > 0) {
				log.info("Menü senkron: {} değişiklik uygulandı.", degisiklik);
			}
		} catch (Exception e) {
			sonHata = e.getMessage();
			log.error("Menü senkron hatası: {}", e.getMessage());
		}
	}

	/**
	 * QR keşfiyle eklenen restoranların web menü kaynaklarını tarar.
	 * Tek bir kaynağın erişilemez olması diğerlerini durdurmaz.
	 */
	private int urlKaynaklariSenkronla() {
		int degisiklik = 0;
		for (Restoran restoran : appRepository.findByMenuKaynakUrlIsNotNull()) {
			try {
				List<KaynakKategori> kategoriler = menuKaynakOkuyucu
						.urlMenuOku(restoran.getMenuKaynakUrl());
				int fark = kategorileriSenkronla(restoran, kategoriler);
				if (fark > 0) {
					appRepository.save(restoran);
					degisiklik += fark;
				}
			} catch (Exception e) {
				log.warn("Menü senkron: '{}' URL kaynağı okunamadı ({}).",
						restoran.getRestoranAdi(), e.getMessage());
			}
		}
		return degisiklik;
	}

	private int restoranSenkronla(KaynakRestoran kr) {
		if (kr.qrKod == null || kr.qrKod.isBlank()) {
			return 0;
		}
		Optional<Restoran> bulunan = appRepository.findByQrKod(kr.qrKod.trim());
		if (bulunan.isEmpty()) {
			return 0; // kaynaktaki bilinmeyen restoranlar atlanır (restoran ekleme ayrı süreç)
		}
		Restoran restoran = bulunan.get();
		int degisiklik = kategorileriSenkronla(restoran, guvenli(kr.kategoriler));

		if (degisiklik > 0) {
			appRepository.save(restoran);
		}
		return degisiklik;
	}

	/**
	 * Kaynak kategori listesini restoranın menüsüyle karşılaştırıp farkları
	 * uygular. Hem dosya kaynaklı hem URL kaynaklı (QR keşfi) senkron kullanır.
	 */
	int kategorileriSenkronla(Restoran restoran, List<KaynakKategori> kaynakKategoriler) {
		int degisiklik = 0;

		for (KaynakKategori kk : guvenli(kaynakKategoriler)) {
			if (kk.kategoriAdi == null || kk.kategoriAdi.isBlank()) {
				continue;
			}
			Kategori kategori = kategoriBulVeyaOlustur(restoran, kk.kategoriAdi.trim());
			if (kategori.getId() == null) {
				degisiklik++; // yeni kategori
			}

			Set<String> kaynaktakiUrunler = new HashSet<>();
			for (KaynakUrun ku : guvenli(kk.urunler)) {
				if (ku.urunAdi == null || ku.urunAdi.isBlank()) {
					continue;
				}
				kaynaktakiUrunler.add(normalize(ku.urunAdi));
				degisiklik += urunSenkronla(kategori, ku);
			}

			// Kaynaktan kaldırılan ürünler menüden düşürülür (mevcut=false)
			for (Urun u : kategori.getUrunler()) {
				if (!kaynaktakiUrunler.contains(normalize(u.getUrunAdi())) && u.isMevcut()) {
					u.setMevcut(false);
					degisiklik++;
					log.info("Menü senkron: '{}' kaynaktan kalktı, menüden düşürüldü.", u.getUrunAdi());
				}
			}
		}

		return degisiklik;
	}

	private Kategori kategoriBulVeyaOlustur(Restoran restoran, String kategoriAdi) {
		for (Kategori k : restoran.getKategoriler()) {
			if (normalize(k.getKategoriAdi()).equals(normalize(kategoriAdi))) {
				return k;
			}
		}
		Kategori yeni = new Kategori();
		yeni.setRestoran(restoran);
		yeni.setKategoriAdi(kategoriAdi);
		yeni.setSiraNo(restoran.getKategoriler().size() + 1);
		restoran.getKategoriler().add(yeni);
		log.info("Menü senkron: yeni kategori '{}' eklendi ({}).", kategoriAdi, restoran.getRestoranAdi());
		return yeni;
	}

	private int urunSenkronla(Kategori kategori, KaynakUrun ku) {
		String ad = ku.urunAdi.trim();
		for (Urun u : kategori.getUrunler()) {
			if (normalize(u.getUrunAdi()).equals(normalize(ad))) {
				return urunGuncelle(u, ku);
			}
		}
		// Kaynağa yeni eklenen ürün
		Urun yeni = new Urun();
		yeni.setKategori(kategori);
		yeni.setUrunAdi(ad);
		yeni.setAciklama(ku.aciklama);
		yeni.setFiyat(ku.fiyat != null ? ku.fiyat : BigDecimal.ZERO);
		yeni.setTahminiKalori(ku.tahminiKalori);
		yeni.setAlerjenler(ku.alerjenler != null ? new HashSet<>(ku.alerjenler) : new HashSet<>());
		yeni.setMevcut(true);
		kategori.getUrunler().add(yeni);
		log.info("Menü senkron: yeni ürün '{}' eklendi ({}).", ad, kategori.getKategoriAdi());
		return 1;
	}

	private int urunGuncelle(Urun u, KaynakUrun ku) {
		int degisiklik = 0;
		if (ku.fiyat != null && u.getFiyat().compareTo(ku.fiyat) != 0) {
			log.info("Menü senkron: '{}' fiyatı {} -> {} TL.", u.getUrunAdi(), u.getFiyat(), ku.fiyat);
			u.setFiyat(ku.fiyat);
			degisiklik++;
		}
		if (ku.aciklama != null && !ku.aciklama.equals(u.getAciklama())) {
			u.setAciklama(ku.aciklama);
			degisiklik++;
		}
		if (ku.tahminiKalori != null && !ku.tahminiKalori.equals(u.getTahminiKalori())) {
			u.setTahminiKalori(ku.tahminiKalori);
			degisiklik++;
		}
		if (ku.alerjenler != null) {
			Set<String> yeni = new HashSet<>(ku.alerjenler);
			if (!yeni.equals(u.getAlerjenler())) {
				u.setAlerjenler(yeni);
				degisiklik++;
			}
		}
		if (!u.isMevcut()) {
			u.setMevcut(true); // kaynağa geri dönen ürün tekrar menüde
			degisiklik++;
		}
		return degisiklik;
	}

	private static String normalize(String s) {
		return s == null ? "" : s.trim().toLowerCase();
	}

	private static <T> List<T> guvenli(List<T> liste) {
		return liste != null ? liste : List.of();
	}

	// ── Durum erişimi (controller için) ──────────────────────────
	public LocalDateTime getSonCalisma() {
		return sonCalisma;
	}

	public int getSonDegisiklik() {
		return sonDegisiklik;
	}

	public long getToplamCalisma() {
		return toplamCalisma;
	}

	public String getSonHata() {
		return sonHata;
	}

	public String getKaynakYolu() {
		return kaynakYolu;
	}

	// ── Kaynak dosya modeli ──────────────────────────────────────
	public static class KaynakMenu {
		public List<KaynakRestoran> restoranlar;
	}

	public static class KaynakRestoran {
		public String qrKod;
		public List<KaynakKategori> kategoriler;
	}

	public static class KaynakKategori {
		public String kategoriAdi;
		public List<KaynakUrun> urunler;
	}

	public static class KaynakUrun {
		public String urunAdi;
		public String aciklama;
		public BigDecimal fiyat;
		public Integer tahminiKalori;
		public List<String> alerjenler;
	}
}
