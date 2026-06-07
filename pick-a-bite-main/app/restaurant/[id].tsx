import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { apiJSON } from "../../lib/api";

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
                <View key={urun.id} style={styles.productCard}>
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
                            {urun.tahminiKalori} kcal
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
                  </View>
                  <View style={styles.priceBox}>
                    <Text style={styles.priceText}>{urun.fiyat.toFixed(0)}</Text>
                    <Text style={styles.priceCurrency}>TL</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
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
});
