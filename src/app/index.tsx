// Splash — entry screen. Branded gradient + Comuna logo, lalu lanjut ke alur berikutnya.
// Ported dari desain "Corelia HRIS Mobile" (SplashScreen), pakai logo Comuna.
import { useEffect } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import ComunaWordmark from "@/assets/logo/comuna-wordmark-white.svg";
import { Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { hasSession } from "@/lib/auth";
export default function SplashScreen() {
  useEffect(() => {
    // Routing entri: ada sesi → Home (gerbang kunci global/LockGate yang menampilkan
    // layar PIN/biometrik bila PIN diset); tanpa sesi → Login. Dijalankan SEGERA
    // (tanpa delay buatan) — splash tampil selama pengecekan sesi + navigasi.
    let cancelled = false;
    (async () => {
      const session = await hasSession();
      if (cancelled) return;
      if (session) router.replace("/home");
      else router.replace("/login");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LinearGradient
      colors={[colors.brand[700], colors.brand[500], colors.brand[400]]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <StatusBar style="light" />

      {/* Orb dekoratif (aproksimasi radial dengan lingkaran transparan) */}
      <View
        style={{
          position: "absolute",
          top: -80,
          right: -60,
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: "rgba(255,255,255,0.10)",
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -100,
          left: -80,
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: "rgba(255,122,92,0.20)",
        }}
      />

      {/* Logo: mark putih + wordmark */}
      <View style={{ alignItems: "center", gap: 18 }}>
        <Image
          source={require("@/assets/logo/comuna-white-sqr.png")}
          style={{ width: 104, height: 104 }}
          resizeMode="contain"
        />
        <ComunaWordmark width={210} height={46} />
      </View>

      {/* Loader */}
      <View style={{ position: "absolute", bottom: 72, alignItems: "center", gap: 12 }}>
        <ActivityIndicator color="#fff" />
        <Txt size={11.5} color="rgba(255,255,255,0.7)" weight="semibold" style={{ letterSpacing: 0.4 }}>
          MEMUAT…
        </Txt>
      </View>

      {/* Footer */}
      <View style={{ position: "absolute", bottom: 22 }}>
        <Txt size={10.5} color="rgba(255,255,255,0.5)" style={{ fontFamily: "JetBrainsMono_500Medium" }}>
          v1.0.0
        </Txt>
      </View>
    </LinearGradient>
  );
}
