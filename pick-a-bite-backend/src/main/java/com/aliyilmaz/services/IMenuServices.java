package com.aliyilmaz.services;

import java.util.List;

import com.aliyilmaz.dto.DtoKategori;
import com.aliyilmaz.dto.DtoKategoriIU;
import com.aliyilmaz.dto.DtoMenu;
import com.aliyilmaz.dto.DtoUrun;
import com.aliyilmaz.dto.DtoUrunIU;

public interface IMenuServices {

	DtoMenu menuGetir(Integer restoranId);

	/** Tüm restoranların menüsünü tek listede döner (mobil için toplu uç). */
	List<DtoMenu> menuleriGetir();

	DtoKategori kategoriOlustur(Integer restoranId, DtoKategoriIU istek);

	DtoKategori kategoriGuncelle(Integer kategoriId, DtoKategoriIU istek);

	void kategoriSil(Integer kategoriId);

	DtoUrun urunOlustur(Integer kategoriId, DtoUrunIU istek);

	DtoUrun urunGuncelle(Integer urunId, DtoUrunIU istek);

	void urunSil(Integer urunId);
}
