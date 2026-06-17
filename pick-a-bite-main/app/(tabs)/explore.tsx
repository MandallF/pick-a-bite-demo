import { Redirect } from "expo-router";

/**
 * "Explore" sekmesinin görünür bir ekranı yoktur. Sekmeye basıldığında
 * (tabs)/_layout.tsx içindeki tabPress dinleyicisi kullanıcıyı doğrudan
 * harita (Home) ekranına döndürür — uygulamayı inceleyen biri için hızlı
 * "ana sayfaya dön" kısayolu. Dinleyici bir şekilde devreye girmez ve bu
 * ekran yine de açılırsa, güvenlik için haritaya yönlendiririz.
 */
export default function HaritayaYonlendir() {
  return <Redirect href="/(tabs)" />;
}
