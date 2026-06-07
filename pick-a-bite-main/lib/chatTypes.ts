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
  etiketler?: string[];
}

/** Backend'den çekilen restoran + menüsü. */
export interface Restaurant {
  ad: string;
  adres: string;
  menuler: MenuItem[];
}

/** Kullanıcı sorgusundan çıkarılan arama kriterleri. */
export interface SearchCriteria {
  maxPrice?: number;
  categories?: string[];
  keywords?: string[];
  preferences?: string[];
}
