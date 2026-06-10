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
import { girisYap } from "../lib/authService";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const handleGiris = async () => {
    setHata(null);
    if (!email.trim() || !sifre) {
      setHata("Lütfen e-posta ve şifrenizi girin.");
      return;
    }
    setYukleniyor(true);
    try {
      await girisYap(email.trim(), sifre);
      // Başarılı: geldiğimiz ekrana (profil) dön — orada bilgiler tazelenir
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      setHata(e?.message ?? "Giriş yapılamadı. Lütfen tekrar deneyin.");
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
              <Ionicons name="restaurant" size={34} color="white" />
            </View>
            <Text style={styles.appName}>Pick A Bite</Text>
            <Text style={styles.subtitle}>Hesabına giriş yap</Text>
          </View>

          <View style={styles.form}>
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
                placeholder="Şifre"
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
              onPress={handleGiris}
              disabled={yukleniyor}
              activeOpacity={0.85}
            >
              {yukleniyor ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>Giriş Yap</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.altLink}
              onPress={() => router.replace("/register")}
              disabled={yukleniyor}
            >
              <Text style={styles.altText}>
                Hesabın yok mu? <Text style={styles.altBold}>Kayıt Ol</Text>
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
  logoWrap: { alignItems: "center", marginTop: 30, marginBottom: 36 },
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
  appName: { fontSize: 26, fontWeight: "800", color: "#1a1a1a" },
  subtitle: { fontSize: 15, color: "#718096", marginTop: 4 },
  form: { gap: 14 },
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
