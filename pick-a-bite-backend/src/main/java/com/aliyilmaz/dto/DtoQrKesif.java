package com.aliyilmaz.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** QR keşif isteği: okutulan web menü adresi + (varsa) kullanıcının konumu. */
@Data
public class DtoQrKesif {

	@NotBlank(message = "Menü adresi (url) zorunludur.")
	@Size(max = 500)
	private String url;

	/** Opsiyonel: restoranın adı (bilinmiyorsa alan adından türetilir). */
	@Size(max = 160)
	private String restoranAdi;

	/** Opsiyonel: kullanıcının konumu — restoran haritada buraya yerleştirilir. */
	private Double enlem;

	private Double boylam;

	/**
	 * Opsiyonel: doluysa menü YENİ restoran açmak yerine bu kayıtlı restorana
	 * bağlanır (menü toplayıcının Places'tan gelen restoranları menülemesi için).
	 */
	private Integer restoranId;
}
