package com.aliyilmaz.services.impl;

import java.math.BigDecimal;
import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.aliyilmaz.dto.DtoQrKesif;
import com.aliyilmaz.dto.DtoQrKesifSonuc;
import com.aliyilmaz.entities.Kategori;
import com.aliyilmaz.entities.Restoran;
import com.aliyilmaz.entities.Urun;
import com.aliyilmaz.exception.ResourceNotFoundException;
import com.aliyilmaz.repository.AppRepository;
import com.aliyilmaz.services.IAppServices;
import com.aliyilmaz.services.impl.MenuSenkronServisi.KaynakKategori;
import com.aliyilmaz.services.impl.MenuSenkronServisi.KaynakUrun;

/**
 * QR ile keşif: kullanıcı, sistemde menüsü olmayan bir restoranda web menü
 * QR'ı okuttuğunda menü sunucu tarafında çıkarılır ve KALICI kaydedilir.
 * <p>
 * Böylece restoran tek bir okutmayla tüm kullanıcılar için menülü hale gelir
 * (kitle kaynaklı veri toplama). Kaynak URL restoran kaydında saklandığından
 * sonraki güncellemeler kullanıcı okutmasına bağlı değildir — restoran,
 * {@link MenuSenkronServisi}'nin zamanlanmış URL taramasına dahil olur.
 * Aynı adres ikinci kez okutulursa yeni kayıt açılmaz, mevcut restoran döner.
 */
@Service
public class QrKesifServisi {

	private static final Logger log = LoggerFactory.getLogger(QrKesifServisi.class);

	/** Konum verilmezse harita pini için varsayılan merkez (Bursa). */
	private static final double VARSAYILAN_ENLEM = 40.1885;
	private static final double VARSAYILAN_BOYLAM = 29.0610;

	private final AppRepository appRepository;
	private final MenuKaynakOkuyucu menuKaynakOkuyucu;
	private final IAppServices appServices;
	private final MenuSenkronServisi menuSenkronServisi;

	public QrKesifServisi(AppRepository appRepository, MenuKaynakOkuyucu menuKaynakOkuyucu,
			IAppServices appServices, MenuSenkronServisi menuSenkronServisi) {
		this.appRepository = appRepository;
		this.menuKaynakOkuyucu = menuKaynakOkuyucu;
		this.appServices = appServices;
		this.menuSenkronServisi = menuSenkronServisi;
	}

	@Transactional
	public DtoQrKesifSonuc kesfet(DtoQrKesif istek) {
		String url = istek.getUrl().trim();

		// 1) Aynı menü kaynağı daha önce keşfedildiyse mevcut kaydı dön.
		//    Karşılaştırma NORMALİZE edilir: http/https, www. öneki ve sondaki
		//    "/" farkları aynı kaynak sayılır (aksi halde kopya restoran açılır).
		Optional<Restoran> kayitli = kaynakSahibiniBul(url);
		if (kayitli.isPresent()) {
			Restoran r = kayitli.get();
			log.info("QR keşif: '{}' zaten kayıtlı (id={}), mevcut kayıt dönüyor.",
					r.getRestoranAdi(), r.getId());
			return new DtoQrKesifSonuc(appServices.restoranGetir(r.getId()), false, urunSay(r));
		}

		// 2) Menüyü kaynaktan çıkar (başarısızsa BusinessException —
		//    mobil taraf chatbot'taki geçici analize geri düşer)
		List<KaynakKategori> kategoriler = menuKaynakOkuyucu.urlMenuOku(url);

		// 2a) YARIŞ KORUMASI: yukarıdaki çekim saniyeler sürebilir; bu sırada
		//     aynı QR tekrar okutulup ilk istek kaydı oluşturmuş olabilir
		//     (telefon zaman aşımına düşse bile sunucu işlemi tamamlar).
		//     Kaydetmeden hemen önce İKİNCİ kez kontrol et — kopyayı önler.
		kayitli = kaynakSahibiniBul(url);
		if (kayitli.isPresent()) {
			Restoran r = kayitli.get();
			log.info("QR keşif: '{}' eşzamanlı istekle zaten eklendi (id={}), kopya açılmadı.",
					r.getRestoranAdi(), r.getId());
			return new DtoQrKesifSonuc(appServices.restoranGetir(r.getId()), false, urunSay(r));
		}

		// 2b) Kayıtlı bir restorana BAĞLAMA modu: menü toplayıcı, Places'tan
		//     gelen menüsüz restoranın web menüsünü bulduğunda yeni kayıt
		//     açmak yerine menüyü o restorana işler ve kaynağı senkrona bağlar.
		if (istek.getRestoranId() != null) {
			Restoran r = appRepository.findById(istek.getRestoranId())
					.orElseThrow(() -> new ResourceNotFoundException(
							"Restoran bulunamadı: " + istek.getRestoranId()));
			r.setMenuKaynakUrl(url);
			menuSenkronServisi.kategorileriSenkronla(r, kategoriler);
			r = appRepository.save(r);
			int urunSayisi = urunSay(r);
			log.info("QR keşif: menü mevcut restorana bağlandı — '{}' (id={}, {} ürün), kaynak: {}",
					r.getRestoranAdi(), r.getId(), urunSayisi, url);
			return new DtoQrKesifSonuc(appServices.restoranGetir(r.getId()), false, urunSayisi);
		}

		// 3) Restoranı oluştur ve menüyü yaz.
		//    Ad önceliği: istekle gelen ad > sayfa başlığı (<title>) > alan adı.
		String ad = istek.getRestoranAdi() != null && !istek.getRestoranAdi().isBlank()
				? istek.getRestoranAdi().trim()
				: menuKaynakOkuyucu.sayfaBasligi(url);
		Restoran restoran = new Restoran();
		restoran.setRestoranAdi(ad != null && !ad.isBlank() ? ad : restoranAdiBelirle(istek, url));
		restoran.setEnlem(istek.getEnlem() != null ? istek.getEnlem() : VARSAYILAN_ENLEM);
		restoran.setBoylam(istek.getBoylam() != null ? istek.getBoylam() : VARSAYILAN_BOYLAM);
		restoran.setAciklama("QR keşfiyle eklendi — menü kaynağı otomatik senkronlanır.");
		restoran.setMenuKaynakUrl(url);

		int siraNo = 1;
		for (KaynakKategori kk : kategoriler) {
			Kategori kategori = new Kategori();
			kategori.setRestoran(restoran);
			kategori.setKategoriAdi(kk.kategoriAdi);
			kategori.setSiraNo(siraNo++);
			for (KaynakUrun ku : kk.urunler) {
				Urun urun = new Urun();
				urun.setKategori(kategori);
				urun.setUrunAdi(ku.urunAdi);
				urun.setAciklama(ku.aciklama);
				urun.setFiyat(ku.fiyat != null ? ku.fiyat : BigDecimal.ZERO);
				urun.setTahminiKalori(ku.tahminiKalori);
				urun.setAlerjenler(ku.alerjenler != null
						? new HashSet<>(ku.alerjenler)
						: new HashSet<>());
				urun.setMevcut(true);
				kategori.getUrunler().add(urun);
			}
			restoran.getKategoriler().add(kategori);
		}

		restoran = appRepository.save(restoran);
		int urunSayisi = urunSay(restoran);
		log.info("QR keşif: '{}' eklendi (id={}, {} ürün) — kaynak: {}",
				restoran.getRestoranAdi(), restoran.getId(), urunSayisi, url);

		return new DtoQrKesifSonuc(appServices.restoranGetir(restoran.getId()), true, urunSayisi);
	}

	/**
	 * Verilen URL ile AYNI kaynağı gösteren kayıtlı restoranı bulur.
	 * Karşılaştırma anahtarı: şema (http/https) yok sayılır, host'taki
	 * "www." kırpılır, sondaki "/" atılır, küçük harfe çevrilir.
	 */
	private Optional<Restoran> kaynakSahibiniBul(String url) {
		String anahtar = urlAnahtari(url);
		if (anahtar.isEmpty()) {
			return Optional.empty();
		}
		for (Restoran r : appRepository.findByMenuKaynakUrlIsNotNull()) {
			if (urlAnahtari(r.getMenuKaynakUrl()).equals(anahtar)) {
				return Optional.of(r);
			}
		}
		return Optional.empty();
	}

	static String urlAnahtari(String url) {
		if (url == null) {
			return "";
		}
		String s = url.trim().toLowerCase();
		s = s.replaceFirst("^https?://", "");
		if (s.startsWith("www.")) {
			s = s.substring(4);
		}
		while (s.endsWith("/")) {
			s = s.substring(0, s.length() - 1);
		}
		return s;
	}

	private static String restoranAdiBelirle(DtoQrKesif istek, String url) {
		if (istek.getRestoranAdi() != null && !istek.getRestoranAdi().isBlank()) {
			return istek.getRestoranAdi().trim();
		}
		try {
			String host = URI.create(url).getHost();
			if (host != null) {
				return host.startsWith("www.") ? host.substring(4) : host;
			}
		} catch (Exception ignored) {
		}
		return "QR ile eklenen restoran";
	}

	private static int urunSay(Restoran r) {
		int toplam = 0;
		for (Kategori k : r.getKategoriler()) {
			for (Urun u : k.getUrunler()) {
				if (u.isMevcut()) {
					toplam++;
				}
			}
		}
		return toplam;
	}
}
