/**
 * QR keşif demosunun önceki kaydını temizler (qr-kesif-demo.bat çağırır).
 *
 * "Köfteci Niyazi Usta" adlı demo restoran(lar)ı veritabanından siler ki
 * "Restoran Eklendi" sahnesi her çekimde sıfırdan yaşansın. IP değişimi
 * yüzünden birden fazla kopya oluştuysa hepsini siler. Backend kapalıysa
 * uyarır ama bat akışını durdurmaz.
 */
const BACKEND = process.env.BACKEND_URL || "http://localhost:8080/pick-a-bite";
const DEMO_AD = "Köfteci Niyazi Usta";

(async () => {
  try {
    const rs = await (await fetch(`${BACKEND}/restoranlar`)).json();
    const demolar = rs.filter((r) => r.restoranAdi === DEMO_AD);
    if (demolar.length === 0) {
      console.log("      Temiz: onceki demo kaydi yok, sahne hazir.");
      return;
    }
    for (const d of demolar) {
      const res = await fetch(`${BACKEND}/restoranlar/${d.id}`, { method: "DELETE" });
      console.log(
        res.ok
          ? `      Onceki demo kaydi silindi (id=${d.id}) — sahne sifirlandi.`
          : `      UYARI: id=${d.id} silinemedi (HTTP ${res.status}).`
      );
    }
  } catch (e) {
    console.log("      UYARI: backend'e ulasilamadi — once demo-baslat.bat'i calistir.");
    console.log("      (Eski demo kaydi varsa su an silinemedi; QR yine de uretilecek.)");
  }
})();
