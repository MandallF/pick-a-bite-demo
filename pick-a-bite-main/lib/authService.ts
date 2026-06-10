/**
 * Kimlik doğrulama servisi — kayıt, giriş, çıkış, mevcut kullanıcı.
 * Backend /auth uçlarıyla konuşur; JWT token'ı api.ts üzerinden yönetir.
 */
import { apiFetch, BACKEND_URL, clearToken, setToken } from "./api";

export interface Kullanici {
  id: number;
  email: string;
  ad?: string;
  soyad?: string;
  butce?: number | null;
  vegan: boolean;
  vejetaryen: boolean;
  glutensiz: boolean;
  helal: boolean;
  laktozsuz: boolean;
  alerjenler: string[];
}

interface TokenYanit {
  token: string;
  tokenTuru: string;
  gecerlilikMs: number;
  kullanici: Kullanici;
}

/**
 * /auth POST isteği — başarısızsa backend'in DtoHata.mesaj alanını okuyup
 * kullanıcıya gösterilebilir, anlaşılır bir Error fırlatır.
 */
async function authPost(path: string, govde: unknown): Promise<TokenYanit> {
  const res = await apiFetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(govde),
  });
  if (!res.ok) {
    let mesaj = "Bir hata oluştu. Lütfen tekrar deneyin.";
    try {
      const hata = await res.json();
      if (hata?.mesaj) mesaj = hata.mesaj;
      // Validasyon hatası varsa ilk alan mesajını göster (ör. "Şifre en az 6...")
      if (Array.isArray(hata?.alanHatalari) && hata.alanHatalari.length > 0) {
        mesaj = hata.alanHatalari[0]?.mesaj ?? mesaj;
      }
    } catch {
      // gövde JSON değilse genel mesaj kalır
    }
    throw new Error(mesaj);
  }
  return (await res.json()) as TokenYanit;
}

/** Yeni hesap oluşturur, token'ı kaydeder ve kullanıcıyı döner. */
export async function kayitOl(
  email: string,
  sifre: string,
  ad: string,
  soyad: string
): Promise<Kullanici> {
  const yanit = await authPost("/auth/kayit", { email, sifre, ad, soyad });
  await setToken(yanit.token);
  return yanit.kullanici;
}

/** Giriş yapar, token'ı kaydeder ve kullanıcıyı döner. */
export async function girisYap(
  email: string,
  sifre: string
): Promise<Kullanici> {
  const yanit = await authPost("/auth/giris", { email, sifre });
  await setToken(yanit.token);
  return yanit.kullanici;
}

/** Token'ı siler (misafir moduna döner). */
export async function cikisYap(): Promise<void> {
  await clearToken();
}

/**
 * Kayıtlı token ile mevcut kullanıcıyı getirir.
 * Token yok / geçersiz / süresi dolmuşsa null döner (misafir).
 */
export async function mevcutKullanici(): Promise<Kullanici | null> {
  try {
    const res = await apiFetch(`${BACKEND_URL}/auth/ben`);
    if (!res.ok) return null;
    return (await res.json()) as Kullanici;
  } catch {
    return null;
  }
}
