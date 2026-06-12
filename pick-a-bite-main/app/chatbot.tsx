import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";

import { apiJSON } from "../lib/api";
import { Message, MenuItem, Restaurant } from "../lib/chatTypes";
import {
  extractName,
  extractSearchCriteria,
  fetchAllRestaurantsFromBackend,
  fetchMenuFromQrUrl,
  filterRestaurants,
} from "../lib/menuService";
import { askGroq } from "../lib/groqClient";

// Hızlı sorgu butonları (UI'a özel sabit)
const QUICK_QUERIES = [
  "200 TL altı sütlü tatlı", "100 TL altı hamburger",
  "Kalorisiz salata önerileri", "300 TL altında ne var?",
  "Vegan seçenekler neler?", "Glutensiz yemekler",
];

// AI mesajları için markdown stil tanımları (kalın, liste, başlık)
const markdownStyles: any = {
  body: { color: "#1a1a1a", fontSize: 14, lineHeight: 21, margin: 0 },
  strong: { fontWeight: "700" },
  paragraph: { marginTop: 0, marginBottom: 6 },
  bullet_list: { marginTop: 2, marginBottom: 2 },
  ordered_list: { marginTop: 2, marginBottom: 2 },
  list_item: { marginVertical: 1 },
  heading1: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  heading2: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  heading3: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
};

// ─── ANA BİLEŞEN ─────────────────────────────
export default function ChatbotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { qrData, restaurantId, ad } = useLocalSearchParams<{
    qrData?: string;
    restaurantId?: string;
    ad?: string;
  }>();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Menü ekranından gelindiyse restoran adı paramla gelir; QR URL'inden
  // gelindiyse alan adından türetilir.
  const restaurantName =
    (ad as string) || (qrData ? extractName(qrData as string) : undefined);

  const [userPrefs, setUserPrefs] = useState<string[]>([]);
  const [userButce, setUserButce] = useState<string>("");
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [menuContext, setMenuContext] = useState<string | undefined>(undefined);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showQuick, setShowQuick] = useState(true);
  const [statusText, setStatusText] = useState("Bağlanıyor...");

  const welcomeText = restaurantName
    ? `📱 **${restaurantName}** restoranının menüsü yükleniyor...\n\nMenüyü analiz ediyorum, biraz bekleyin! 🔍`
    : "Merhaba! 👋 Ben Pick a Bite yapay zekâ asistanınım.\n\nEtraftaki restoranları ve menülerini analiz ederek size en uygun önerileri sunabilirim.\n\nNasıl yardımcı olabilirim?";

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", text: welcomeText, timestamp: new Date() },
  ]);

  // ── Başlangıçta veri yükleme ──
  useEffect(() => {
    const load = async () => {
      // 1) Profil tercihlerini yükle
      try {
        const saved = await AsyncStorage.getItem("userPreferences");
        if (saved) setUserPrefs(JSON.parse(saved));
        const savedButce = await AsyncStorage.getItem("userButce");
        if (savedButce) setUserButce(savedButce);
      } catch { /* ignore */ }

      // 2) Menü ekranından gelindiyse (restaurantId) O restoranın menüsünü
      //    backend'den çek — sohbet doğrudan o menü bağlamında başlar.
      if (restaurantId) {
        setStatusText("Menü yükleniyor...");
        try {
          const m: any = await apiJSON(`/restoranlar/${restaurantId}/menu`, {}, 8000);
          let menuText = "";
          for (const k of m?.kategoriler || []) {
            menuText += `${k.kategoriAdi}:\n`;
            for (const u of k.urunler || []) {
              const kal = u.tahminiKalori != null ? `, ~${u.tahminiKalori} kcal` : "";
              const alj =
                u.alerjenler && u.alerjenler.length > 0
                  ? ` [alerjen: ${u.alerjenler.join(", ")}]`
                  : "";
              const desc = u.aciklama ? ` — ${u.aciklama}` : "";
              menuText += `  - ${u.urunAdi}: ${u.fiyat} TL${kal}${alj}${desc}\n`;
            }
          }
          setMenuContext(menuText);
          setStatusText("✓");
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === "welcome"
                ? {
                    ...msg,
                    text: `✅ **${restaurantName}** menüsünü inceledim!\n\nBu menüyle ilgili her şeyi sorabilirsin — örneğin *"en hafif seçenek hangisi?"* ya da *"300 TL ile ne yiyebilirim?"* 🍽️`,
                  }
                : msg
            )
          );
        } catch {
          setStatusText("Menü alınamadı");
        }
        setIsInitializing(false);
        return;
      }

      // 3) QR Code varsa O menüyü çek, yoksa tüm restoranları çek
      if (qrData) {
        // ✅ QR code'dan restoran menüsü çek
        setStatusText("Menü yükleniyor...");
        const menu = await fetchMenuFromQrUrl(qrData as string);
        setMenuContext(menu);
        setStatusText("✓");
        // Analiz bitti — "yükleniyor" karşılamasını sonuç mesajıyla değiştir,
        // kullanıcı beklemede kalmadığını görsün.
        const menuHazir = !!menu && menu.length > 40;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === "welcome"
              ? {
                  ...m,
                  text: menuHazir
                    ? `✅ **${restaurantName}** menüsünü analiz ettim!\n\nArtık sorularını sorabilirsin — örneğin *"300 TL altı ne önerirsin?"* ya da *"en hafif seçenek hangisi?"* 🍽️`
                    : `⚠️ **${restaurantName}** menüsüne şu anda ulaşamadım.\n\nBağlantıyı kontrol edip tekrar deneyebilir ya da genel sorularını sorabilirsin.`,
                }
              : m
          )
        );
      } else {
        // Tüm restoranları çek
        setStatusText("Restoranlar yükleniyor...");
        const restaurants = await fetchAllRestaurantsFromBackend();

        if (restaurants.length > 0) {
          setAllRestaurants(restaurants);

          // Menü yapısını görüntü için oluştur
          let menuText = "";
          for (const rest of restaurants.slice(0, 5)) {
            const mesafeStr = rest.mesafe != null ? ` (${rest.mesafe} km)` : "";
            menuText += `\n${rest.ad}${mesafeStr}:\n`;
            const grouped: Record<string, MenuItem[]> = {};
            for (const item of rest.menuler.slice(0, 20)) {
              if (!grouped[item.kategori]) grouped[item.kategori] = [];
              grouped[item.kategori].push(item);
            }
            for (const [cat, items] of Object.entries(grouped)) {
              menuText += `  ${cat}:\n`;
              menuText += items.map(i => `    • ${i.urunAdi}: ₺${i.fiyat}`).join("\n") + "\n";
            }
          }

          setMenuContext(menuText);
          setStatusText("Çevrimiçi ✓");
        } else {
          setStatusText("Veri bulunamadı");
        }
      }

      setIsInitializing(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrData, restaurantId]);

  // ── Mesaj gönder ──
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || isInitializing) return;

    setShowQuick(false);
    setInputText("");

    const userMsg: Message = {
      id: `u-${Date.now()}`, role: "user", text: trimmed, timestamp: new Date(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsLoading(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Sorguyu analiz et ve filtrele
    const criteria = extractSearchCriteria(trimmed);
    const filteredResults = allRestaurants.length > 0
      ? filterRestaurants(allRestaurants, criteria, userPrefs)
      : [];
    // Veri var ama hiçbir ürün eşleşmediyse: boş sonuç durumu
    const noMatch = allRestaurants.length > 0 && filteredResults.length === 0;

    askGroq(nextMessages, restaurantName, menuContext, userPrefs, filteredResults, noMatch, userButce)
      .then(aiText => {
        setMessages(m => [...m, { id: `a-${Date.now()}`, role: "assistant", text: aiText, timestamp: new Date() }]);
      })
      .finally(() => {
        setIsLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
      });
  }, [messages, isLoading, isInitializing, restaurantName, menuContext, userPrefs, userButce, allRestaurants]);

  const renderMsg = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.row, isUser ? styles.rowUser : styles.rowAI]}>
        {!isUser && <View style={styles.avatar}><Ionicons name="sparkles" size={14} color="white" /></View>}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          {isUser ? (
            <Text style={[styles.msgText, styles.textUser]}>{item.text}</Text>
          ) : (
            <Markdown style={markdownStyles}>{item.text}</Markdown>
          )}
          <Text style={[styles.timeText, isUser && { color: "rgba(255,255,255,0.6)" }]}>
            {item.timestamp.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  // Android'de status bar yüksekliği
  const topPad = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : insets.top;

  return (
    <View style={[styles.safe, { paddingTop: topPad }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerIcon}><Ionicons name="sparkles" size={16} color="white" /></View>
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {restaurantName ?? "Yapay Zekâ Asistanı"}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.dot, isInitializing && { backgroundColor: "#f6ad55" }]} />
              <Text style={[styles.statusText, isInitializing && { color: "#f6ad55" }]}>{statusText}</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* MESAJ + INPUT */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={topPad + 56}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={i => i.id}
          renderItem={renderMsg}
          contentContainerStyle={styles.msgList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={<>
            {isLoading && (
              <View style={[styles.row, styles.rowAI]}>
                <View style={styles.avatar}><Ionicons name="sparkles" size={14} color="white" /></View>
                <View style={[styles.bubble, styles.bubbleAI, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color="#319795" />
                  <Text style={styles.loadingText}>Analiz ediliyor...</Text>
                </View>
              </View>
            )}
            {showQuick && !isLoading && (
              <View style={styles.quickWrap}>
                <Text style={styles.quickTitle}>Hızlı sorgular:</Text>
                <View style={styles.quickGrid}>
                  {QUICK_QUERIES.map(q => (
                    <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => sendMessage(q)}>
                      <Text style={styles.quickText}>{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>}
        />

        {/* Öneri geldiyse: restoranları haritada gör kısayolu */}
        {messages.length > 1 && !isLoading && !isInitializing && (
          <TouchableOpacity style={styles.mapBtn} onPress={() => router.push("/(tabs)")}>
            <Ionicons name="map-outline" size={18} color="#319795" />
            <Text style={styles.mapBtnText}>Restoranları haritada gör</Text>
          </TouchableOpacity>
        )}

        {/* INPUT — her zaman en altta, navigasyon çubuğunun üstünde */}
        <View style={styles.inputWrap}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor="#aaa"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading && !isInitializing}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading || isInitializing) && styles.sendDisabled]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading || isInitializing}
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── STİLLER ─────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fa" },
  flex: { flex: 1, overflow: "hidden" },

  header: { backgroundColor: "white", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#efefef", elevation: 3, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#f5f5f5", justifyContent: "center", alignItems: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, marginHorizontal: 8 },
  headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#319795", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#38a169" },
  statusText: { fontSize: 11, color: "#38a169", fontWeight: "500" },

  msgList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  row: { flexDirection: "row", marginBottom: 14, alignItems: "flex-end" },
  rowUser: { justifyContent: "flex-end" },
  rowAI: { justifyContent: "flex-start" },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#319795", justifyContent: "center", alignItems: "center", marginRight: 8, marginBottom: 2 },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: "#319795", borderBottomRightRadius: 4 },
  bubbleAI: { backgroundColor: "white", borderBottomLeftRadius: 4, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4 },
  msgText: { fontSize: 14, lineHeight: 21 },
  textUser: { color: "white" },
  textAI: { color: "#1a1a1a" },
  timeText: { fontSize: 10, color: "#aaa", marginTop: 4, alignSelf: "flex-end" },

  loadingBubble: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  loadingText: { fontSize: 13, color: "#666", fontStyle: "italic" },

  quickWrap: { marginTop: 8, marginBottom: 4 },
  quickTitle: { fontSize: 12, color: "#888", fontWeight: "600", marginBottom: 8, marginLeft: 2 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn: { backgroundColor: "white", borderWidth: 1.5, borderColor: "#319795", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  quickText: { fontSize: 12, color: "#319795", fontWeight: "600" },

  mapBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#e6fffa", paddingVertical: 10, marginHorizontal: 12, marginBottom: 4, borderRadius: 12 },
  mapBtnText: { color: "#319795", fontWeight: "600", fontSize: 13 },

  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#efefef",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f7fa",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 120,
    minHeight: 44,
    color: "#1a1a1a",
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#319795", justifyContent: "center", alignItems: "center" },
  sendDisabled: { backgroundColor: "#c0d8d8" },
});
