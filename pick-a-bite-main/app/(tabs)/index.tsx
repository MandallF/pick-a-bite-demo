import { Ionicons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { apiJSON } from "../../lib/api";

interface BackendRestaurant {
  id: number;
  restoranAdi: string;
  enlem: number;
  boylam: number;
  adres?: string;
  aciklama?: string;
  qrKod?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [restaurants, setRestaurants] = useState<BackendRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  // Backend'den restoranları çek
  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const data = await apiJSON<BackendRestaurant[]>("/restoranlar");
        if (Array.isArray(data)) {
          setRestaurants(data);
        }
      } catch (err) {
        console.warn("Restoranlar yüklenemedi:", err);
      } finally {
        setLoading(false);
      }
    };
    loadRestaurants();
  }, []);

  const filteredRestaurants = searchText
    ? restaurants.filter((r) =>
        r.restoranAdi.toLowerCase().includes(searchText.toLowerCase())
      )
    : restaurants;

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    const granted = status === "granted";
    setHasPermission(granted);
    if (!granted) {
      Alert.alert("İzin Gerekli", "QR kod okutmak için kamera izni vermelisin.");
    }
    return granted;
  };

  const handleOpenCamera = async () => {
    const granted = await requestCameraPermission();
    if (granted) router.push("/camera");
  };

  const handleOpenChatbot = () => router.push("/chatbot");
  const handleOpenProfile = () => router.push("/profile");

  const handleRestaurantPress = (restaurant: BackendRestaurant) => {
    router.push({
      pathname: "/restaurant/[id]",
      params: { id: String(restaurant.id), ad: restaurant.restoranAdi },
    });
  };

  // İlk restorana göre merkez (varsa), yoksa Bursa merkez
  const initialRegion = {
    latitude: restaurants.length > 0 ? restaurants[0].enlem : 40.195,
    longitude: restaurants.length > 0 ? restaurants[0].boylam : 29.06,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
  };

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
      >
        {filteredRestaurants.map((r) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.enlem, longitude: r.boylam }}
            title={r.restoranAdi}
            description={r.adres || r.aciklama || "Menüyü görmek için tıkla"}
            pinColor="#319795"
            onCalloutPress={() => handleRestaurantPress(r)}
            onPress={() => handleRestaurantPress(r)}
          />
        ))}
      </MapView>

      {/* Arama + Profil */}
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

      {/* Yükleme göstergesi */}
      {loading && (
        <View style={styles.loadingBanner}>
          <ActivityIndicator color="#319795" />
          <Text style={styles.loadingText}>Restoranlar yükleniyor...</Text>
        </View>
      )}

      {/* Sonuç sayacı */}
      {!loading && (
        <View style={styles.counterBanner}>
          <Ionicons name="restaurant-outline" size={16} color="#319795" />
          <Text style={styles.counterText}>
            {filteredRestaurants.length} restoran bulundu
          </Text>
        </View>
      )}

      {/* "Bugün canınız ne çekiyor?" Chatbot Paneli */}
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
            <Text style={styles.chatbotPanelSubtitle}>
              AI ile kişisel öneri al
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#319795" />
      </TouchableOpacity>

      {/* QR Tarayıcı Butonu */}
      <TouchableOpacity style={styles.qrButton} onPress={handleOpenCamera}>
        <Ionicons name="qr-code-outline" size={28} color="white" />
        <Text style={styles.qrButtonText}>Menü Tara</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  loadingBanner: {
    position: "absolute",
    top: 120,
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
  counterBanner: {
    position: "absolute",
    top: 120,
    alignSelf: "center",
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  counterText: { color: "#319795", fontSize: 13, fontWeight: "600" },
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
  chatbotPanelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
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
