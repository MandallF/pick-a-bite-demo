import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { apiJSON } from "../../lib/api";
import { PREF_LABELS } from "../../lib/groqClient";
import { urunUygunMu } from "../../lib/menuService";

interface Urun {
  id: number;
  urunAdi: string;
  aciklama?: string;
  fiyat: number;
  tahminiKalori?: number;
  alerjenler?: string[];
  mevcut?: boolean;
}

interface Kategori {
  id: number;
  kategoriAdi: string;
  siraNo: number;
  urunler: Urun[];
}

interface MenuResponse {
  restoran: {
    id: number;
    restoranAdi: string;
    adres?: string;
    aciklama?: string;
    qrKod?: string;
  };
  kategoriler: Kategori[];
}

export default function RestaurantScreen() {
  const router = useRouter();
  const { id, ad } = useLocalSearchParams<{ id: string; ad?: string }>();
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Ürün detay modalı: dokunulan ürün + kategorisi
  const [seciliUrun, setSeciliUrun] = useState<{
    urun: Urun;
    kategoriAdi: string;
  } | null>(null);
  // Kullanıcının kayıtlı beslenme tercihleri (uygunluk rozetinde kullanılır)
  const [userPrefs, setUserPrefs] = useState<string[]>([]);
  // Otomatik menü senkronunun son çalışma bilgisi ("X dk önce güncellendi")
  const [senkronYazisi, setSenkronYazisi] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("userPreferences")
      .then((saved) => setUserPrefs(saved ? JSON.parse(saved) : []))
      .catch(() => setUserPrefs([]));
  }, []);

  // Menü güncelliği göstergesi — backend'deki zamanlanmış senkronun durumu.
  // Alınamazsa sessizce gizlenir (gösterge bilgilendirme amaçlı).
  useEffect(() => {
    apiJSON<{ sonCalisma?: string }>("/senkron/durum", {}, 5000)
      .then((d) => {
        if (!d?.sonCalisma) return;
        const farkDk = Math.max(
          0,
          Math.round((Date.now() - new Date(d.sonCalisma).getTime()) / 60000)
        );
        setSenkronYazisi(
          farkDk === 0
            ? "Menü az önce kaynakla senkronlandı"
            : `Menü ${farkDk} dk önce kaynakla senkronlandı`
        );
      })
      .catch(() => setSenkronYazisi(null));
  }, []);

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const data = await apiJSON<MenuResponse>(`/restoranlar/${id}/menu`, {}, 8000);
        setMenu(data);
      } catch (err: any) {
        setError(err?.message ?? "Menü yüklenemedi");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadMenu();
  }, [id]);

  const totalProducts = menu?.kategoriler.reduce(
    (sum, k) => sum + (k.urunler?.length ?? 0),
    0
  ) ?? 0;

  // Urun -> menuService.MenuItem dönüşümü (alerjenler alanı "etiketler" olarak beklenir)
  const toMenuItem = (urun: Urun, kategoriAdi: string) => ({
    urunAdi: urun.urunAdi,
    fiyat: urun.fiyat,
    kategori: kategoriAdi,
    aciklama: urun.aciklama,
    etiketler: urun.alerjenler,
    tahminiKalori: urun.tahminiKalori,
  });

  // Ürünle çelişen tercih id'leri (boş dizi = uygun)
  const uyumsuzTercihler = (urun: Urun, kategoriAdi: string): string[] =>
    userPrefs.filter(
      (pref) => !urunUygunMu(toMenuItem(urun, kategoriAdi), [pref])
    );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: ad || menu?.restoran?.restoranAdi || "Menü",
          headerStyle: { backgroundColor: "#319795" },
          headerTintColor: "white",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#319795" />
          <Text style={styles.loadingText}>Menü yükleniyor...</Text>
        </View>
      )}

      {error && (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color="#e53e3e" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.retryBtnText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      )}

      {menu && !loading && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Restoran Üst Banner */}
          <View style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Ionicons name="restaurant" size={32} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.restaurantName}>
                {menu.restoran.restoranAdi}
              </Text>
              {menu.restoran.adres && (
                <View style={styles.bannerInfoRow}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.bannerInfoText}>
                    {menu.restoran.adres}
                  </Text>
                </View>
              )}
              {menu.restoran.aciklama && (
                <Text style={styles.bannerDesc}>{menu.restoran.aciklama}</Text>
              )}
              <View style={styles.statRow}>
                <View style={styles.statChip}>
                  <Text style={styles.statChipText}>
                    {menu.kategoriler.length} kategori
                  </Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statChipText}>{totalProducts} ürün</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Menü henüz eklenmemiş restoran (QR keşfi bekleniyor) */}
          {totalProducts === 0 && (
            <View style={styles.bosMenuKutu}>
              <Ionicons name="restaurant-outline" size={40} color="#a0aec0" />
              <Text style={styles.bosMenuBaslik}>Menü henüz eklenmedi</Text>
              <Text style={styles.bosMenuText}>
                Bu restoranın dijital menüsü sisteme henüz aktarılmadı.
                Restorandaysanız masadaki QR menüyü okutarak menüyü siz
                ekleyebilirsiniz — eklenen menü herkes için görünür olur ve
                otomatik güncellenir.
              </Text>
              <TouchableOpacity
                style={styles.bosMenuQrBtn}
                onPress={() => router.push("/camera")}
                activeOpacity={0.85}
              >
                <Ionicons name="qr-code-outline" size={18} color="white" />
                <Text style={styles.bosMenuQrText}>QR Menü Okut</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Kategoriler */}
          {menu.kategoriler.map((kategori) => (
            <View key={kategori.id} style={styles.categoryBlock}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryDot} />
                <Text style={styles.categoryTitle}>{kategori.kategoriAdi}</Text>
                <Text style={styles.categoryCount}>
                  ({kategori.urunler?.length ?? 0})
                </Text>
              </View>

              {kategori.urunler?.map((urun) => (
                <TouchableOpacity
                  key={urun.id}
                  style={styles.productCard}
                  activeOpacity={0.7}
                  onPress={() =>
                    setSeciliUrun({ urun, kategoriAdi: kategori.kategoriAdi })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName}>{urun.urunAdi}</Text>
                    {urun.aciklama && (
                      <Text style={styles.productDesc}>{urun.aciklama}</Text>
                    )}
                    <View style={styles.productMeta}>
                      {urun.tahminiKalori != null && (
                        <View style={styles.metaChip}>
                          <Ionicons name="flame-outline" size={12} color="#ed8936" />
                          <Text style={styles.metaText}>
                            ~{urun.tahminiKalori} kcal
                          </Text>
                        </View>
                      )}
                      {urun.alerjenler && urun.alerjenler.length > 0 && (
                        <View style={[styles.metaChip, styles.allergenChip]}>
                          <Ionicons name="warning-outline" size={12} color="#c53030" />
                          <Text style={[styles.metaText, { color: "#c53030" }]}>
                            {urun.alerjenler.join(", ")}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.detayIpucu}>Detay için dokunun</Text>
                  </View>
                  <View style={styles.priceBox}>
                    <Text style={styles.priceText}>{urun.fiyat.toFixed(0)}</Text>
                    <Text style={styles.priceCurrency}>TL</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Yüzen chatbot butonu menünün son ürünlerini kapatmasın */}
          <View style={{ height: totalProducts > 0 ? 96 : 24 }} />
        </ScrollView>
      )}

      {/* ── BU MENÜ HAKKINDA SOR (chatbot, restoran bağlamıyla) ── */}
      {menu && !loading && totalProducts > 0 && (
        <TouchableOpacity
          style={styles.chatFab}
          activeOpacity={0.85}
          onPress={() =>
            router.push({
              pathname: "/chatbot",
              params: {
                restaurantId: String(menu.restoran.id),
                ad: menu.restoran.restoranAdi,
              },
            })
          }
        >
          <Ionicons name="chatbubbles" size={20} color="white" />
          <Text style={styles.chatFabText}>Bu Menü Hakkında Sor</Text>
        </TouchableOpacity>
      )}

      {/* ── ÜRÜN DETAY MODALI ── */}
      <Modal
        visible={seciliUrun !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSeciliUrun(null)}
      >
        <Pressable
          style={styles.modalArkaplan}
          onPress={() => setSeciliUrun(null)}
        >
          {/* İç panele dokununca kapanmasın */}
          <Pressable style={styles.modalPanel} onPress={() => {}}>
            {seciliUrun && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Başlık + kategori */}
                <View style={styles.modalBaslikSatir}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalUrunAdi}>
                      {seciliUrun.urun.urunAdi}
                    </Text>
                    <View style={styles.modalKategoriChip}>
                      <Text style={styles.modalKategoriText}>
                        {seciliUrun.kategoriAdi}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.modalKapatBtn}
                    onPress={() => setSeciliUrun(null)}
                  >
                    <Ionicons name="close" size={22} color="#4a5568" />
                  </TouchableOpacity>
                </View>

                {/* Açıklama */}
                {seciliUrun.urun.aciklama && (
                  <Text style={styles.modalAciklama}>
                    {seciliUrun.urun.aciklama}
                  </Text>
                )}

                {/* Fiyat + kalori satırı */}
                <View style={styles.modalBilgiSatir}>
                  <View style={styles.modalFiyatKutu}>
                    <Text style={styles.modalFiyatText}>
                      {seciliUrun.urun.fiyat.toFixed(0)} TL
                    </Text>
                  </View>
                  {seciliUrun.urun.tahminiKalori != null ? (
                    <View style={styles.modalKaloriKutu}>
                      <Ionicons name="flame" size={16} color="#ed8936" />
                      <Text style={styles.modalKaloriText}>
                        ~{seciliUrun.urun.tahminiKalori} kcal (tahminî)
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.modalKaloriYokKutu}>
                      <Ionicons name="flame-outline" size={14} color="#a0aec0" />
                      <Text style={styles.modalKaloriYokText}>
                        Kalori analizi henüz yapılmadı
                      </Text>
                    </View>
                  )}
                </View>

                {/* Alerjenler */}
                {seciliUrun.urun.alerjenler &&
                seciliUrun.urun.alerjenler.length > 0 ? (
                  <View style={styles.modalAlerjenKutu}>
                    <View style={styles.modalAlerjenBaslik}>
                      <Ionicons name="warning" size={16} color="#c53030" />
                      <Text style={styles.modalAlerjenBaslikText}>
                        Alerjen bilgisi
                      </Text>
                    </View>
                    <Text style={styles.modalAlerjenText}>
                      {seciliUrun.urun.alerjenler.join(", ")}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.modalAlerjenYokKutu}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color="#2f855a"
                    />
                    <Text style={styles.modalAlerjenYokText}>
                      Bilinen alerjen kaydı yok
                    </Text>
                  </View>
                )}

                {/* Kullanıcı tercihlerine göre uygunluk */}
                {userPrefs.length > 0 &&
                  (() => {
                    const uyumsuz = uyumsuzTercihler(
                      seciliUrun.urun,
                      seciliUrun.kategoriAdi
                    );
                    return uyumsuz.length === 0 ? (
                      <View style={styles.modalUygunKutu}>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#2f855a"
                        />
                        <Text style={styles.modalUygunText}>
                          Beslenme tercihlerinize uygun görünüyor
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.modalUygunsuzKutu}>
                        <Ionicons name="close-circle" size={18} color="#c53030" />
                        <Text style={styles.modalUygunsuzText}>
                          Şu tercihlerinizle uyumlu olmayabilir:{" "}
                          {uyumsuz
                            .map((p) => PREF_LABELS[p] || p)
                            .join(", ")}
                        </Text>
                      </View>
                    );
                  })()}

                {/* Tahminî bilgi uyarısı (gereksinim: kesin sağlık tavsiyesi değildir) */}
                <View style={styles.modalUyariKutu}>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color="#718096"
                  />
                  <Text style={styles.modalUyariText}>
                    Kalori ve alerjen bilgileri yapay zekâ destekli tahminlerdir;
                    kesin sağlık tavsiyesi değildir. Ciddi alerji durumunda
                    sipariş öncesinde restorandan doğrulama yapınız.
                  </Text>
                </View>

                <View style={{ height: 8 }} />
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  loadingText: { marginTop: 12, color: "#666", fontSize: 14 },
  errorText: { marginTop: 12, color: "#e53e3e", fontSize: 15, textAlign: "center" },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#319795",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: "white", fontWeight: "600" },
  scrollContent: { padding: 16 },
  banner: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  bannerIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#319795",
    justifyContent: "center",
    alignItems: "center",
  },
  restaurantName: { fontSize: 18, fontWeight: "700", color: "#1a202c" },
  bannerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  bannerInfoText: { color: "#666", fontSize: 12 },
  bannerDesc: { color: "#4a5568", fontSize: 13, marginTop: 4 },
  statRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  statChip: {
    backgroundColor: "#e6fffa",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statChipText: { color: "#319795", fontSize: 11, fontWeight: "600" },
  categoryBlock: { marginBottom: 24 },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  categoryDot: { width: 4, height: 18, borderRadius: 2, backgroundColor: "#319795" },
  categoryTitle: { fontSize: 16, fontWeight: "700", color: "#1a202c" },
  categoryCount: { fontSize: 13, color: "#999" },
  productCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productName: { fontSize: 15, fontWeight: "600", color: "#1a202c" },
  productDesc: { color: "#4a5568", fontSize: 12, marginTop: 4, lineHeight: 16 },
  productMeta: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef5e7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaText: { color: "#ed8936", fontSize: 11, fontWeight: "600" },
  allergenChip: { backgroundColor: "#fed7d7" },
  priceBox: {
    alignItems: "center",
    backgroundColor: "#319795",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
  },
  priceText: { color: "white", fontWeight: "700", fontSize: 18, lineHeight: 20 },
  priceCurrency: { color: "white", fontSize: 10, opacity: 0.9 },
  detayIpucu: { color: "#a0aec0", fontSize: 10, marginTop: 6 },

  /* Yüzen chatbot butonu */
  chatFab: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#319795",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 13,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  chatFabText: { color: "white", fontWeight: "700", fontSize: 14 },

  /* Boş menü (QR keşfi bekleyen restoran) */
  bosMenuKutu: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bosMenuBaslik: { fontSize: 16, fontWeight: "700", color: "#4a5568" },
  bosMenuText: {
    color: "#718096",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  bosMenuQrBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#319795",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 4,
  },
  bosMenuQrText: { color: "white", fontWeight: "700", fontSize: 14 },

  /* Ürün detay modalı */
  modalArkaplan: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalPanel: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalBaslikSatir: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  modalUrunAdi: { fontSize: 20, fontWeight: "700", color: "#1a202c" },
  modalKategoriChip: {
    alignSelf: "flex-start",
    backgroundColor: "#e6fffa",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  modalKategoriText: { color: "#319795", fontSize: 11, fontWeight: "600" },
  modalKapatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalAciklama: {
    color: "#4a5568",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  modalBilgiSatir: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  modalFiyatKutu: {
    backgroundColor: "#319795",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalFiyatText: { color: "white", fontWeight: "700", fontSize: 18 },
  modalKaloriKutu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef5e7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalKaloriText: { color: "#c05621", fontSize: 13, fontWeight: "600" },
  modalKaloriYokKutu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f7fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalKaloriYokText: { color: "#a0aec0", fontSize: 12 },
  modalAlerjenKutu: {
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#fed7d7",
  },
  modalAlerjenBaslik: { flexDirection: "row", alignItems: "center", gap: 6 },
  modalAlerjenBaslikText: {
    color: "#c53030",
    fontWeight: "700",
    fontSize: 13,
  },
  modalAlerjenText: { color: "#742a2a", fontSize: 13, marginTop: 6 },
  modalAlerjenYokKutu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  modalAlerjenYokText: { color: "#2f855a", fontSize: 13 },
  modalUygunKutu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fff4",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#c6f6d5",
  },
  modalUygunText: { color: "#2f855a", fontSize: 13, fontWeight: "600", flex: 1 },
  modalUygunsuzKutu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#fed7d7",
  },
  modalUygunsuzText: {
    color: "#c53030",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  modalUyariKutu: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f7fafc",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  modalUyariText: { color: "#718096", fontSize: 11, lineHeight: 16, flex: 1 },
});
