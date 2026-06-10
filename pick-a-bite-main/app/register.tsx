import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { kayitOl } from "../lib/authService";

export default function RegisterScreen() {
  const router = useRouter();
  const [ad, setAd] = useState("");
  const [soyad, setSoyad] = useState("");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const handleKayit = async () => {
    setHata(null);
    if (!ad.trim() || !email.trim() || !sifre) {
      setHata("Lütfen ad, e-posta ve şifre alanlarını doldurun.");
      return;
    }
    if (sifre.length < 6) {
      setHata("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    setYukleniyor(true);
    try {
      await kayitOl(email.trim(), sifre, ad.trim(), soyad.trim());
      // Başarılı: geldiğimiz ekrana (profil) dön — orada bilgiler tazelenir
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      setHata(e?.message ?? "Kayıt yapılamadı. Lütfen tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={26} color="#1a1a1a" />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="person-add" size={32} color="white" />
            </View>
            <Text style={styles.appName}>Hesap Oluştur</Text>
            <Text style={styles.subtitle}>Tercihlerini kaydet, kişisel öneri al</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <Ionicons name="person-outline" size={20} color="#319795" />
                <TextInput
                  style={styles.input}
                  placeholder="Ad"
                  placeholderTextColor="#aaa"
                  value={ad}
                  onChangeText={setAd}
                  editable={!yukleniyor}
                />
              </View>
              <View style={[styles.inputWrap, { flex: 1 }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Soyad"
                  placeholderTextColor="#aaa"
                  value={soyad}
                  onChangeText={setSoyad}
                  editable={!yukleniyor}
                />
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={20} color="#319795" />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor="#aaa"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                editable={!yukleniyor}
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={20} color="#319795" />
              <TextInput
                style={styles.input}
                placeholder="Şifre (en az 6 karakter)"
                placeholderTextColor="#aaa"
                secureTextEntry
                value={sifre}
                onChangeText={setSifre}
                editable={!yukleniyor}
              />
            </View>

            {hata && (
              <View style={styles.hataBox}>
                <Ionicons name="alert-circle" size={16} color="#e53e3e" />
                <Text style={styles.hataText}>{hata}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, yukleniyor && styles.btnDisabled]}
              onPress={handleKayit}
              disabled={yukleniyor}
              activeOpacity={0.85}
            >
              {yukleniyor ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>Kayıt Ol</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.altLink}
              onPress={() => router.replace("/login")}
              disabled={yukleniyor}
            >
              <Text style={styles.altText}>
                Zaten hesabın var mı? <Text style={styles.altBold}>Giriş Yap</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fa" },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  logoWrap: { alignItems: "center", marginTop: 24, marginBottom: 30 },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#319795",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#319795",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  appName: { fontSize: 24, fontWeight: "800", color: "#1a1a1a" },
  subtitle: { fontSize: 14, color: "#718096", marginTop: 4, textAlign: "center" },
  form: { gap: 14 },
  row: { flexDirection: "row", gap: 10 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: "#eaeaea",
  },
  input: { flex: 1, fontSize: 15, color: "#1a1a1a" },
  hataBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff5f5",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fed7d7",
  },
  hataText: { flex: 1, fontSize: 13, color: "#c53030" },
  btn: {
    backgroundColor: "#319795",
    borderRadius: 14,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#319795",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  btnDisabled: { backgroundColor: "#9ac7c7", shadowOpacity: 0, elevation: 0 },
  btnText: { color: "white", fontSize: 16, fontWeight: "700" },
  altLink: { alignItems: "center", marginTop: 16, padding: 8 },
  altText: { fontSize: 14, color: "#718096" },
  altBold: { color: "#319795", fontWeight: "700" },
});
