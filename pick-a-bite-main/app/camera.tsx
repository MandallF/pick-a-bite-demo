import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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
  // Senkron kilit: kamera saniyede ~30 kare okur, setScanned ise asenkrondur.
  // Bu yüzden tek bir QR, state güncellenene kadar birkaç kez işlenip Alert'leri
  // ÜST ÜSTE yığabilir. useRef anında günceller → aynı turdaki kareleri bloklar.
  const processingRef = useRef(false);
  // Son işlenen geçersiz QR: kullanıcı kamerayı çevirene kadar aynı koda tekrar
  // uyarı açma (kamera açık kalır, tek dokunuşla hızlı yeniden tarama mümkün).
  const lastDataRef = useRef<string | null>(null);

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
    // Senkron kilit + aynı geçersiz QR'ı sessizce yoksay:
    // Alert yığılmasını ve sonsuz uyarı döngüsünü tek satırda engeller.
    if (processingRef.current || data === lastDataRef.current) return;
    processingRef.current = true;

    setScanned(true);

    // 1) QR bir web URL'i ise: QR KEŞFİ — menü sunucuda çıkarılıp KALICI
    //    kaydedilir (restoran tüm kullanıcılar için menülü olur ve otomatik
    //    senkrona girer). Çıkarılamazsa eski davranışa düşülür: chatbot
    //    menüyü o oturum için geçici analiz eder.
    if (/^https?:\/\//i.test(data)) {
      setChecking(true);
      try {
        // Konum varsa restoran haritada kullanıcının olduğu yere yerleşir.
        // getLastKnownPositionAsync izin istemez; izin yoksa null döner.
        let konum: Location.LocationObject | null = null;
        try {
          konum = await Location.getLastKnownPositionAsync();
        } catch {}

        const sonuc: any = await apiJSON(
          "/restoranlar/qr-kesif",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: data,
              enlem: konum?.coords.latitude,
              boylam: konum?.coords.longitude,
            }),
          },
          // Gerçek siteler yavaş yanıtlayabilir; erken vazgeçmek sunucuda işlem
          // sürerken kullanıcıyı tekrar okutmaya itiyordu (kopya riski).
          25000
        );
        if (sonuc?.restoran?.id) {
          if (sonuc.yeniEklendi) {
            Alert.alert(
              "Restoran Eklendi 🎉",
              `"${sonuc.restoran.restoranAdi}" menüsüyle birlikte (${sonuc.urunSayisi} ürün) sisteme kaydedildi. Menü artık haritada herkese açık ve otomatik güncellenecek.`,
              [{ text: "Menüyü Aç" }]
            );
          }
          router.replace({
            pathname: "/restaurant/[id]",
            params: {
              id: String(sonuc.restoran.id),
              ad: sonuc.restoran.restoranAdi,
            },
          });
          return;
        }
        throw new Error("keşif sonuçsuz");
      } catch {
        // Menü çıkarılamadı / backend kapalı → geçici AI analizi (eski akış)
        router.replace({ pathname: "/chatbot", params: { qrData: data } });
      } finally {
        setChecking(false);
      }
      return;
    }

    // 2) Aksi halde backend QR kodu varsay → sistemde kayıtlı mı doğrula
    setChecking(true);
    try {
      // Uç DtoMenu döner: { restoran: {id, restoranAdi...}, kategoriler: [...] }
      const yanit: any = await apiJSON(`/restoranlar/qr/${encodeURIComponent(data)}`);
      const restoran = yanit?.restoran ?? yanit;
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
        "Bu QR kod sisteme kayıtlı bir restorana ait değil. Geri dönebilir ya da kamerayı farklı bir QR koda çevirip tekrar tarayabilirsiniz.",
        [
          // Tek dokunuşla haritaya dön
          { text: "Geri Dön", style: "cancel", onPress: () => router.back() },
          {
            // Kamerayı hemen tekrar aç. Bu geçersiz QR'ı hatırla ki ona bakmaya
            // devam etsen bile yeni uyarı açılmasın; farklı QR'a çevirince okunur.
            text: "Tamam",
            onPress: () => {
              lastDataRef.current = data;
              processingRef.current = false;
              setScanned(false);
            },
          },
        ]
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

        {/* Tarama yapıldıysa (ve doğrulama bitmişse) tekrar tara butonu —
            tam sıfırlama: aynı QR bile yeniden okunabilir */}
        {scanned && !checking && (
          <TouchableOpacity
            onPress={() => {
              lastDataRef.current = null;
              processingRef.current = false;
              setScanned(false);
            }}
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
