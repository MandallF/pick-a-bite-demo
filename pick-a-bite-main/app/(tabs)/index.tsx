import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Camera } from "expo-camera";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

import { Restaurant } from "../../lib/chatTypes";
import { fetchAllRestaurantsFromBackend, urunUygunMu } from "../../lib/menuService";

export default function HomeScreen() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [userPrefs, setUserPrefs] = useState<string[]>([]);
  const [locationGranted, setLocationGranted] = useState(false);

  // İlk açılış: konum izni + restoran verisi (bir kez)
  useEffect(() => {
    (async () => {
      // 1) Konum izni (gereksinim: konum tabanlı keşif)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          setLocationGranted(true);
        } else {
          Alert.alert(
            "Konum İzni",
            "Konum izni verilmedi. Yakın restoranlar varsayılan bölgeye (Bursa) göre gösterilecek."
          );
        }
      } catch {
        /* izin akışı başarısız — varsayılan bölge ile devam */
      }

      // 2) Restoranlar + menüleri (mesafe + uygunluk için)
      try {
        const data = await fetchAllRestaurantsFromBackend();
        setRestaurants(data);
      } catch (err) {
        console.warn("Restoranlar yüklenemedi:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Profil tercihleri: ekran HER odaklandığında tazelenir.
  // (Bu ekran bir tab olduğu için bellekte kalır; profilden dönünce
  // useEffect yeniden çalışmaz — bu yüzden useFocusEffect gerekir.)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem("userPreferences")
        .then((saved) => setUserPrefs(saved ? JSON.parse(saved) : []))
        .catch(() => setUserPrefs([]));
    }, [])
  );

  // Menüsü sisteme eklenmiş restoran mı? (QR keşfi/senkron öncesi boş olabilir)
  const menusuVar = (rest: Restaurant): boolean =>
    Array.isArray(rest.menuler) && rest.menuler.length > 0;

  // Tercihe uygun en az bir ürünü olan restoran mı?
  const uygunMu = (rest: Restaurant): boolean =>
    userPrefs.length > 0 && rest.menuler.some((item) => urunUygunMu(item, userPrefs));

  // Harita pin rengi: tercih yok ya da MENÜ BİLİNMİYOR → mavi (nötr),
  // uygun → yeşil, menüsü var ama uygun değil → kırmızı.
  // Menüsüz restoranı kırmızı boyamak yanıltıcı olur: uygunsuz değil, bilinmiyor.
  const pinRengi = (rest: Restaurant): string => {
    if (userPrefs.length === 0 || !menusuVar(rest)) return "#2b6cb0"; // mavi
    return uygunMu(rest) ? "#2f855a" : "#e53e3e"; // yeşil / kırmızı
  };

  const filtered = searchText
    ? restaurants.filter((r) => r.ad.toLowerCase().includes(searchText.toLowerCase()))
    : restaurants;

  // Liste görünümünde: tercihe uygunlar → menüsü olanlar → yakınlar
  const sortedForList = [...filtered].sort((a, b) => {
    const ua = uygunMu(a) ? 0 : 1;
    const ub = uygunMu(b) ? 0 : 1;
    if (ua !== ub) return ua - ub;
    const ma = menusuVar(a) ? 0 : 1;
    const mb = menusuVar(b) ? 0 : 1;
    if (ma !== mb) return ma - mb;
    return (a.mesafe ?? 999) - (b.mesafe ?? 999);
  });

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    const granted = status === "granted";
    if (!granted) {
      Alert.alert("İzin Gerekli", "QR kod okutmak için kamera izni vermelisin.");
    }
    return granted;
  };

  const handleOpenCamera = async () => {
    if (await requestCameraPermission()) router.push("/camera");
  };
  const handleOpenChatbot = () => router.push("/chatbot");
  const handleOpenProfile = () => router.push("/profile");
  const handleRestaurantPress = (rest: Restaurant) => {
    if (rest.id == null) return;
    router.push({
      pathname: "/restaurant/[id]",
      params: { id: String(rest.id), ad: rest.ad },
    });
  };

  const initialRegion = {
    latitude: restaurants.find((r) => r.enlem != null)?.enlem ?? 40.195,
    longitude: restaurants.find((r) => r.boylam != null)?.boylam ?? 29.06,
    // Bursa genelindeki restoranlar görünsün diye geniş başlangıç çerçevesi
    latitudeDelta: 0.09,
    longitudeDelta: 0.09,
  };

  return (
    <View style={styles.container}>
      {/* ── İÇERİK: HARİTA veya LİSTE ── */}
      {viewMode === "map" ? (
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialRegion={initialRegion}
          showsUserLocation={locationGranted}
        >
          {filtered.map((r) =>
            r.enlem != null && r.boylam != null ? (
              <Marker
                key={r.id}
                coordinate={{ latitude: r.enlem, longitude: r.boylam }}
                title={r.ad}
                description={
                  !menusuVar(r)
                    ? "Menü henüz eklenmedi · QR okutarak ekleyebilirsin"
                    : userPrefs.length === 0
                    ? r.adres || "Menü için tıkla"
                    : uygunMu(r)
                    ? "✓ Tercihlerine uygun · Menü için tıkla"
                    : "✗ Tercihlerine uygun değil · Menü için tıkla"
                }
                pinColor={pinRengi(r)}
                onCalloutPress={() => handleRestaurantPress(r)}
                onPress={() => handleRestaurantPress(r)}
              />
            ) : null
          )}
        </MapView>
      ) : (
        <FlatList
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          data={sortedForList}
          keyExtractor={(r) => String(r.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listCard}
              onPress={() => handleRestaurantPress(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.listIcon, { backgroundColor: pinRengi(item) }]}>
                <Ionicons name="restaurant" size={22} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listName}>{item.ad}</Text>
                <View style={styles.listMetaRow}>
                  {item.mesafe != null && (
                    <View style={styles.metaChip}>
                      <Ionicons name="location-outline" size={12} color="#666" />
                      <Text style={styles.metaText}>{item.mesafe} km</Text>
                    </View>
                  )}
                  <Text style={styles.listAdres} numberOfLines={1}>
                    {item.adres}
                  </Text>
                </View>
                {!menusuVar(item) ? (
                  <View style={styles.menuYokBadge}>
                    <Ionicons name="help-circle-outline" size={13} color="#718096" />
                    <Text style={styles.menuYokText}>
                      Menü henüz yok — QR okutarak ekleyebilirsin
                    </Text>
                  </View>
                ) : (
                  userPrefs.length > 0 &&
                  (uygunMu(item) ? (
                    <View style={styles.uygunBadge}>
                      <Ionicons name="checkmark-circle" size={13} color="#2f855a" />
                      <Text style={styles.uygunText}>Tercihlerine uygun</Text>
                    </View>
                  ) : (
                    <View style={styles.uygunsuzBadge}>
                      <Ionicons name="close-circle" size={13} color="#e53e3e" />
                      <Text style={styles.uygunsuzText}>Tercihlerine uygun değil</Text>
                    </View>
                  ))
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
          ListHeaderComponent={<View style={{ height: 108 }} />}
          ListEmptyComponent={
            !loading ? <Text style={styles.emptyText}>Restoran bulunamadı</Text> : null
          }
        />
      )}

      {/* ── Arama + Profil ── */}
      <View style={styles.searchOverlay}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            placeholder="Restoran ara..."
            placeholderTextColor="#999"
            style={styles.input}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={handleOpenProfile}>
          <Ionicons name="person-outline" size={22} color="#319795" />
        </TouchableOpacity>
      </View>

      {/* ── Harita / Liste geçişi + sayaç ── */}
      {!loading && (
        <View style={styles.toggleBanner}>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[styles.segmentBtn, viewMode === "map" && styles.segmentActive]}
              onPress={() => setViewMode("map")}
            >
              <Ionicons name="map-outline" size={15} color={viewMode === "map" ? "white" : "#319795"} />
              <Text style={[styles.segmentText, viewMode === "map" && styles.segmentTextActive]}>
                Harita
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, viewMode === "list" && styles.segmentActive]}
              onPress={() => setViewMode("list")}
            >
              <Ionicons name="list-outline" size={15} color={viewMode === "list" ? "white" : "#319795"} />
              <Text style={[styles.segmentText, viewMode === "list" && styles.segmentTextActive]}>
                Liste
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.counterText}>{filtered.length} restoran</Text>
        </View>
      )}

      {/* ── Yükleme göstergesi ── */}
      {loading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator color="#319795" />
          <Text style={styles.loadingText}>Restoranlar yükleniyor...</Text>
        </View>
      )}

      {/* ── Chatbot Paneli (sadece harita modunda) ── */}
      {viewMode === "map" && (
        <TouchableOpacity
          style={styles.chatbotPanel}
          onPress={handleOpenChatbot}
          activeOpacity={0.85}
        >
          <View style={styles.chatbotPanelLeft}>
            <View style={styles.chatbotIconCircle}>
              <Ionicons name="sparkles" size={18} color="white" />
            </View>
            <View>
              <Text style={styles.chatbotPanelTitle}>Bugün canınız ne çekiyor?</Text>
              <Text style={styles.chatbotPanelSubtitle}>AI ile kişisel öneri al</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#319795" />
        </TouchableOpacity>
      )}

      {/* ── QR Tarayıcı Butonu ── */}
      <TouchableOpacity style={styles.qrButton} onPress={handleOpenCamera}>
        <Ionicons name="qr-code-outline" size={28} color="white" />
        <Text style={styles.qrButtonText}>Menü Tara</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fafc" },

  searchOverlay: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  input: { flex: 1, marginLeft: 8, color: "#333", fontSize: 15 },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  // Harita / Liste geçiş çubuğu
  toggleBanner: {
    position: "absolute",
    top: 104,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  segmentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  segmentActive: { backgroundColor: "#319795" },
  segmentText: { fontSize: 13, color: "#319795", fontWeight: "600" },
  segmentTextActive: { color: "white" },
  counterText: {
    color: "#319795",
    fontSize: 13,
    fontWeight: "600",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },

  loadingBanner: {
    position: "absolute",
    top: 150,
    alignSelf: "center",
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  loadingText: { color: "#666", fontSize: 13, fontWeight: "500" },

  // Liste görünümü
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 110 },
  listCard: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  listIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#319795",
    justifyContent: "center",
    alignItems: "center",
  },
  listName: { fontSize: 15, fontWeight: "700", color: "#1a202c" },
  listMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { color: "#666", fontSize: 12, fontWeight: "500" },
  listAdres: { color: "#999", fontSize: 12, flex: 1 },
  uygunBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: "#e8faf0",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  uygunText: { color: "#2f855a", fontSize: 11, fontWeight: "600" },
  uygunsuzBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: "#fdecec",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  uygunsuzText: { color: "#e53e3e", fontSize: 11, fontWeight: "600" },
  menuYokBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: "#edf2f7",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  menuYokText: { color: "#718096", fontSize: 11, fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#999", marginTop: 40, fontSize: 14 },

  chatbotPanel: {
    position: "absolute",
    bottom: 130,
    left: 16,
    right: 16,
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  chatbotPanelLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  chatbotIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#319795",
    justifyContent: "center",
    alignItems: "center",
  },
  chatbotPanelTitle: { color: "#1a202c", fontWeight: "700", fontSize: 14 },
  chatbotPanelSubtitle: { color: "#666", fontSize: 12, marginTop: 2 },

  qrButton: {
    position: "absolute",
    bottom: 30,
    left: 16,
    right: 16,
    backgroundColor: "#319795",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#319795",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  qrButtonText: { color: "white", fontWeight: "700", fontSize: 16 },
});
