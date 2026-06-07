/**
 * Chatbot ekranı ve servisleri için ortak tip tanımları.
 */

export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
}

/** Bir restoran menüsündeki tek ürün. */
export interface MenuItem {
  urunAdi: string;
  fiyat: number;
  kategori: string;
  aciklama?: string;
  /** Ürünün alerjenleri (backend'den gelen alerjenler dizisi). */
  etiketler?: string[];
  tahminiKalori?: number;
  /** Filtreleme sonrası: ürünün bulunduğu restoranın mesafesi (km). */
  restoranMesafe?: number;
}

/** Backend'den çekilen restoran + menüsü. */
export interface Restaurant {
  id?: number;
  ad: string;
  adres: string;
  menuler: MenuItem[];
  enlem?: number;
  boylam?: number;
  /** Referans konuma uzaklık (km), istemcide hesaplanır. */
  mesafe?: number;
}

/** Kullanıcı sorgusundan çıkarılan arama kriterleri. */
export interface SearchCriteria {
  maxPrice?: number;
  categories?: string[];
  keywords?: string[];
  preferences?: string[];
}
