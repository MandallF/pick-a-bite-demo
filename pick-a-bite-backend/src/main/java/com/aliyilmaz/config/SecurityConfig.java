package com.aliyilmaz.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

import com.aliyilmaz.security.CustomUserDetailsService;
import com.aliyilmaz.security.JwtAuthFilter;
import com.aliyilmaz.security.RestAuthenticationEntryPoint;

/**
 * Spring Security + JWT yapilandirmasi.
 * <p>
 * Tasarim: "misafir + opsiyonel giris". Cogu uc herkese acik kalir (harita,
 * menu, QR, restoran/menu yonetimi); yalnizca kullaniciya ozel uclar
 * ({@code /auth/ben}, {@code /kullanici/**}) gecerli bir JWT gerektirir.
 */
@Configuration
public class SecurityConfig {

	private final JwtAuthFilter jwtAuthFilter;
	private final CustomUserDetailsService userDetailsService;
	private final RestAuthenticationEntryPoint authenticationEntryPoint;

	public SecurityConfig(JwtAuthFilter jwtAuthFilter, CustomUserDetailsService userDetailsService,
			RestAuthenticationEntryPoint authenticationEntryPoint) {
		this.jwtAuthFilter = jwtAuthFilter;
		this.userDetailsService = userDetailsService;
		this.authenticationEntryPoint = authenticationEntryPoint;
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	public DaoAuthenticationProvider authenticationProvider() {
		DaoAuthenticationProvider saglayici = new DaoAuthenticationProvider();
		saglayici.setUserDetailsService(userDetailsService);
		saglayici.setPasswordEncoder(passwordEncoder());
		return saglayici;
	}

	@Bean
	public AuthenticationManager authenticationManager(AuthenticationConfiguration konfig) throws Exception {
		return konfig.getAuthenticationManager();
	}

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		http
				.csrf(AbstractHttpConfigurer::disable)
				.httpBasic(AbstractHttpConfigurer::disable)
				.formLogin(AbstractHttpConfigurer::disable)
				.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.exceptionHandling(e -> e.authenticationEntryPoint(authenticationEntryPoint))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(
								AntPathRequestMatcher.antMatcher("/pick-a-bite/auth/kayit"),
								AntPathRequestMatcher.antMatcher("/pick-a-bite/auth/giris")).permitAll()
						.requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.GET,
								"/pick-a-bite/restoranlar/**"),
								AntPathRequestMatcher.antMatcher(HttpMethod.GET,
										"/pick-a-bite/senkron/**")).permitAll()
						.requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.POST,
								"/pick-a-bite/restoranlar/**"),
								AntPathRequestMatcher.antMatcher(HttpMethod.POST,
										"/pick-a-bite/kategoriler/**"),
								AntPathRequestMatcher.antMatcher(HttpMethod.POST,
										"/pick-a-bite/urunler/**")).permitAll()
						.requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.PUT,
								"/pick-a-bite/restoranlar/**"),
								AntPathRequestMatcher.antMatcher(HttpMethod.PUT,
										"/pick-a-bite/kategoriler/**"),
								AntPathRequestMatcher.antMatcher(HttpMethod.PUT,
										"/pick-a-bite/urunler/**")).permitAll()
						.requestMatchers(AntPathRequestMatcher.antMatcher(HttpMethod.DELETE,
								"/pick-a-bite/restoranlar/**"),
								AntPathRequestMatcher.antMatcher(HttpMethod.DELETE,
										"/pick-a-bite/kategoriler/**"),
								AntPathRequestMatcher.antMatcher(HttpMethod.DELETE,
										"/pick-a-bite/urunler/**")).permitAll()
						.requestMatchers(
								AntPathRequestMatcher.antMatcher("/pick-a-bite/auth/ben"),
								AntPathRequestMatcher.antMatcher("/pick-a-bite/kullanici/**")).authenticated()
						.anyRequest().authenticated())
				.authenticationProvider(authenticationProvider())
				.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

		return http.build();
	}
}
