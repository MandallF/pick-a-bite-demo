package com.aliyilmaz.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** QR keşif sonucu: kalıcı kaydedilen (veya zaten kayıtlı olan) restoran. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DtoQrKesifSonuc {

	private DtoRestoran restoran;

	/** true ise restoran bu okutmayla sisteme yeni eklendi. */
	private boolean yeniEklendi;

	/** Restoranın menüsündeki (görünür) ürün sayısı. */
	private int urunSayisi;
}
