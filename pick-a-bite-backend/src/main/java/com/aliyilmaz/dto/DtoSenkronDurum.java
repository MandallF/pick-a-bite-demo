package com.aliyilmaz.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Otomatik menü senkronizasyonunun anlık durumu. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DtoSenkronDurum {

	/** Son senkron çalışmasının zamanı (hiç çalışmadıysa null). */
	private LocalDateTime sonCalisma;

	/** Son çalışmada uygulanan değişiklik sayısı. */
	private int sonDegisiklik;

	/** Uygulama açıldığından beri toplam çalışma sayısı. */
	private long toplamCalisma;

	/** Son çalışmadaki hata mesajı (başarılıysa null). */
	private String sonHata;
}
