package com.aliyilmaz.controller;

import com.aliyilmaz.dto.DtoQrKesif;
import com.aliyilmaz.dto.DtoQrKesifSonuc;

public interface IQrKesifController {

	DtoQrKesifSonuc kesfet(DtoQrKesif istek);
}
