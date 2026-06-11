package com.aliyilmaz.starter;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(scanBasePackages = "com.aliyilmaz")
@EntityScan(basePackages = "com.aliyilmaz.entities")
@EnableJpaRepositories(basePackages = "com.aliyilmaz.repository")
// Otomatik menü senkronizasyonu (MenuSenkronServisi) için zamanlayıcı
@EnableScheduling
public class PickABiteApplication {

	public static void main(String[] args) {
		SpringApplication.run(PickABiteApplication.class, args);
	}

}
