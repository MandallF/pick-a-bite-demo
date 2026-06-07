/**
 * Merkezi API yardımcıları.
 * Tüm ekranlar backend'e buradan erişir — BACKEND_URL ve fetch mantığı tek yerde.
 */

// Backend adresi .env'deki EXPO_PUBLIC_BACKEND_URL'den gelir.
// Tanımsızsa yerel geliştirme için localhost'a düşer.
export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://localhost:8080/pick-a-bite";

// Tunnel servisleri (Cloudflare / localtunnel / ngrok) tarayıcı uyarı
// sayfalarını atlamak için bu header'ları ister.
const TUNNEL_HEADERS: Record<string, string> = {
  "bypass-tunnel-reminder": "true",
  "ngrok-skip-browser-warning": "true",
  "User-Agent": "PickABite/1.0",
};

/**
 * Zaman aşımlı fetch — tunnel header'ları otomatik eklenir.
 * Ham Response döner (çağıran taraf kendi işler).
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs = 6000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      headers: { ...TUNNEL_HEADERS, ...(options.headers || {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * apiFetch + JSON parse. Hata durumunda exception fırlatır.
 */
export async function apiJSON<T = any>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 6000
): Promise<T> {
  // path "/restoranlar" gibi göreli ya da tam URL olabilir
  const url = path.startsWith("http") ? path : `${BACKEND_URL}${path}`;
  const res = await apiFetch(url, options, timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}
