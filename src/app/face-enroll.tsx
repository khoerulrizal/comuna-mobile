// Pendaftaran wajah referensi (Fase 2) — ambil foto wajah, validasi server, simpan.
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, Icon, Txt } from "@/components/ui";
import { colors, radii } from "@/theme/tokens";
import { AuthError, ApiError } from "@/lib/api";
import { enrollFace, deleteFace } from "@/lib/face";
import { getProfile } from "@/lib/profile";

export default function FaceEnrollScreen() {
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);

  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain) requestPerm();
  }, [perm, requestPerm]);

  // Status pendaftaran saat ini (untuk teks "Daftar ulang" / tombol hapus).
  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        setAlreadyEnrolled(!!p.faceEnrollment?.enrolled);
      } catch (e) {
        if (e instanceof AuthError) router.replace("/login");
      }
    })();
  }, []);

  async function capture() {
    if (!camRef.current || capturing) return;
    setCapturing(true);
    setError(null);
    try {
      const pic = await camRef.current.takePictureAsync({ quality: 0.6 });
      if (pic?.uri) setPhotoUri(pic.uri);
    } finally {
      setCapturing(false);
    }
  }

  async function save() {
    if (!photoUri || saving) return;
    setSaving(true);
    setError(null);
    try {
      await enrollFace(photoUri);
      setSuccess(true);
    } catch (e) {
      if (e instanceof AuthError) return router.replace("/login");
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal mendaftarkan wajah");
      setPhotoUri(null); // wajib ambil ulang
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      await deleteFace();
      setAlreadyEnrolled(false);
    } catch {
      /* abaikan */
    } finally {
      setSaving(false);
    }
  }

  // ── Sukses ──
  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
        <StatusBar style="dark" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 }}>
          <View style={{ width: 92, height: 92, borderRadius: 30, backgroundColor: colors.mint[100], alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={46} color={colors.mint[700]} strokeWidth={2.5} />
          </View>
          <Txt size={21} weight="extrabold" color={colors.neutral[900]} style={{ textAlign: "center" }}>
            Wajah Terdaftar
          </Txt>
          <Txt size={13} color={colors.neutral[500]} style={{ textAlign: "center" }}>
            Wajah Anda akan dipakai untuk verifikasi saat clock-in/out.
          </Txt>
          <Button
            label="Selesai"
            size="lg"
            full
            onPress={() => router.back()}
            left={<Icon name="check" size={18} color="#fff" strokeWidth={2} />}
            style={{ marginTop: 14 }}
          />
        </View>
      </View>
    );
  }

  // ── Izin kamera ──
  if (!perm) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator color={colors.brand[500]} />
      </View>
    );
  }
  if (!perm.granted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 28 }}>
        <Txt size={14} color={colors.neutral[600]} style={{ textAlign: "center", marginBottom: 16 }}>
          Izinkan akses kamera untuk mendaftarkan wajah.
        </Txt>
        <Button label="Izinkan Kamera" size="md" onPress={requestPerm} />
      </View>
    );
  }

  // ── Kamera + bingkai bulat ──
  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[900], paddingTop: insets.top }}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 6 }}>
          <Icon name="chevronLeft" size={24} color="#fff" strokeWidth={2} />
        </Pressable>
        <Txt size={16} weight="bold" color="#fff" style={{ marginLeft: 4 }}>Daftarkan Wajah</Txt>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 22 + insets.bottom }}>
        {/* Panduan */}
        <View style={{ alignItems: "center", marginTop: 6, minHeight: 40 }}>
          <Txt size={12.5} color="rgba(255,255,255,0.85)" style={{ textAlign: "center" }}>
            {photoUri
              ? "Pastikan wajah jelas & tidak buram, lalu daftarkan."
              : "Posisikan wajah di tengah bingkai, cahaya cukup, tanpa masker/kacamata gelap."}
          </Txt>
        </View>

        {/* Bingkai */}
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 286, height: 286, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 256, height: 256, borderRadius: 128, overflow: "hidden", backgroundColor: "#000" }}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="cover" />
              ) : (
                <CameraView ref={camRef} style={{ flex: 1 }} facing="front" />
              )}
            </View>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                width: 272,
                height: 272,
                borderRadius: 136,
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: photoUri ? colors.mint[500] : colors.brand[400],
              }}
            />
          </View>

          {/* Status / error */}
          <View style={{ minHeight: 44, marginTop: 14, alignItems: "center", justifyContent: "center", gap: 6 }}>
            {error ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.rose[500] }}>
                <Icon name="close" size={14} color="#fff" strokeWidth={2.5} />
                <Txt size={12} weight="bold" color="#fff" style={{ textAlign: "center", flexShrink: 1 }}>{error}</Txt>
              </View>
            ) : alreadyEnrolled && !photoUri ? (
              <Txt size={11.5} color="rgba(255,255,255,0.6)" style={{ textAlign: "center" }}>
                Wajah sudah terdaftar — ambil foto baru untuk memperbarui.
              </Txt>
            ) : null}
          </View>
        </View>

        {/* Kontrol bawah */}
        {photoUri ? (
          <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
            <Button label="Ulangi" variant="outline" size="lg" onPress={() => setPhotoUri(null)} disabled={saving} style={{ flex: 1 }} />
            <Button
              label="Daftarkan"
              size="lg"
              onPress={save}
              disabled={saving}
              left={saving ? <ActivityIndicator color="#fff" /> : undefined}
              style={{ flex: 1 }}
            />
          </View>
        ) : (
          <View style={{ alignItems: "center", gap: 14 }}>
            <Pressable
              onPress={capture}
              disabled={capturing}
              hitSlop={10}
              style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 5, borderColor: "rgba(255,255,255,0.45)", alignItems: "center", justifyContent: "center" }}
            >
              <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                {capturing ? <ActivityIndicator color={colors.brand[500]} /> : null}
              </View>
            </Pressable>
            {alreadyEnrolled ? (
              <Pressable onPress={remove} disabled={saving} hitSlop={8}>
                <Txt size={12.5} weight="semibold" color={colors.rose[300]}>Hapus pendaftaran wajah</Txt>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
}
