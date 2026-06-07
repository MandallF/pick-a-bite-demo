import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { apiJSON } from "../lib/api";

export default function CameraScreen() {
  const router = useRouter();

  // Kamera izin durumunu tutar
  const [permission, requestPermission] = useCameraPermissions();
  // QR kodun taranıp taranmadığını kontrol eden durum
  const [scanned, setScanned] = useState(false);
  // QR doğrulanırken yükleme göstergesi
  const [checking, setChecking] = useState(false);

  // İzin kontrolü
  if (!permission) {
    return <View />;
  }

  // İzin kontrolü: Kullanıcı kamera izni vermediyse izin isteme ekranı göster
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 10 }}>Kamera izni gerekli</Text>

        <TouchableOpacity onPress={requestPermission}>
          <Text style={{ color: "#319795", fontWeight: "bold" }}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // QR okuma mantığı
  const handleBarcodeScanned = async ({ data }: any) => {
    // Eğer daha önce tarama yapıldıysa işlemi durdur
    if (scanned) return;

    setScanned(true);
    console.log("QR DATA:", data);

    // 1) QR bir web URL'i ise: restoran web menüsünü chatbot analiz etsin
    if (/^https?:\/\//i.test(data)) {
      router.replace({ pathname: "/chatbot", params: { qrData: data } });
      return;
    }

    // 2) Aksi halde backend QR kodu varsay → sistemde kayıtlı mı doğrula
    setChecking(true);
    try {
      const restoran: any = await apiJSON(`/restoranlar/qr/${encodeURIComponent(data)}`);
      if (restoran && restoran.id) {
        router.replace({
          pathname: "/restaurant/[id]",
          params: { id: String(restoran.id), ad: restoran.restoranAdi },
        });
        return;
      }
      throw new Error("kayıtlı değil");
    } catch {
      // Gereksinim Senaryo 2: geçersiz / kayıtlı olmayan QR
      Alert.alert(
        "Geçersiz QR Kod",
        "Bu QR kod sisteme kayıtlı bir restorana ait değil.",
        [{ text: "Tekrar Tara", onPress: () => setScanned(false) }]
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Kamera Görüntüsü*/}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      {/* Kapatma Butonu*/}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bilgi Çubuğu*/}
      <View style={styles.bottomInfo}>
        {checking ? (
          <View style={styles.checkingRow}>
            <ActivityIndicator color="white" />
            <Text style={styles.text}>QR kod doğrulanıyor...</Text>
          </View>
        ) : (
          <Text style={styles.text}>QR kodu çerçeve içine getir</Text>
        )}

        {/* Tarama yapıldıysa (ve doğrulama bitmişse) tekrar tara butonu */}
        {scanned && !checking && (
          <TouchableOpacity
            onPress={() => setScanned(false)}
            style={styles.resetBtn}
          >
            <Text style={{ color: "white" }}>Tekrar Tara</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  topBar: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
  },

  bottomInfo: {
    position: "absolute",
    bottom: 60,
    width: "100%",
    alignItems: "center",
  },

  text: {
    color: "white",
    fontSize: 16,
    marginBottom: 10,
  },

  checkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  resetBtn: {
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#ED8936",
    borderRadius: 20,
  },
});
