package com.aliyilmaz.controller.impl;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aliyilmaz.controller.ISenkronController;
import com.aliyilmaz.dto.DtoSenkronDurum;
import com.aliyilmaz.services.impl.MenuSenkronServisi;

@RestController
@RequestMapping("/pick-a-bite/senkron")
public class SenkronController implements ISenkronController {

	private final MenuSenkronServisi senkronServisi;

	public SenkronController(MenuSenkronServisi senkronServisi) {
		this.senkronServisi = senkronServisi;
	}

	@Override
	@GetMapping("/durum")
	public DtoSenkronDurum durum() {
		return new DtoSenkronDurum(
				senkronServisi.getSonCalisma(),
				senkronServisi.getSonDegisiklik(),
				senkronServisi.getToplamCalisma(),
				senkronServisi.getSonHata());
	}
}
