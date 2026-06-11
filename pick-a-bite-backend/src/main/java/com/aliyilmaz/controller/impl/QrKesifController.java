package com.aliyilmaz.controller.impl;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aliyilmaz.controller.IQrKesifController;
import com.aliyilmaz.dto.DtoQrKesif;
import com.aliyilmaz.dto.DtoQrKesifSonuc;
import com.aliyilmaz.services.impl.QrKesifServisi;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/pick-a-bite/restoranlar")
public class QrKesifController implements IQrKesifController {

	private final QrKesifServisi qrKesifServisi;

	public QrKesifController(QrKesifServisi qrKesifServisi) {
		this.qrKesifServisi = qrKesifServisi;
	}

	@Override
	@PostMapping("/qr-kesif")
	public DtoQrKesifSonuc kesfet(@Valid @RequestBody DtoQrKesif istek) {
		return qrKesifServisi.kesfet(istek);
	}
}
