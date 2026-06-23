// Flow clock-in/out — lokasi → wajah(swafoto) → catatan → tinjau → sukses.
// Langkah menyesuaikan validationTypes shift. Validasi final tetap di server.
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, TextInput, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button, Card, Icon, type IconName, Pill, Txt } from "@/components/ui";
import { ClockMap, type ClockMapHandle } from "@/components/ClockMap";
import { colors, fonts, radii, shadows } from "@/theme/tokens";
import { ApiError, AuthError } from "@/lib/api";
import {
  distanceMeters,
  getClockContext,
  readLocation,
  submitClockIn,
  submitClockOut,
  uploadSelfie,
  type ClockContext,
  type ClockLocation,
  type GpsReading,
} from "@/lib/attendance";

type Step = "location" | "face" | "note" | "review";

export default function ClockScreen() {
  const insets = useSafeAreaInsets();
  const [ctx, setCtx] = useState<ClockContext | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [idx, setIdx] = useState(0);

  const [gps, setGps] = useState<GpsReading | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [done, setDone] = useState<null | { label: string; detail: string }>(null);

  const action = ctx?.clock?.attendanceStatus === "CLOCKED_IN" ? "out" : "in";

  useEffect(() => {
    (async () => {
      try {
        const c = await getClockContext();
        setCtx(c);
        const v = c.validation;
        const next: Step[] = [];
        if (v?.gps) next.push("location");
        if (v?.photo) next.push("face");
        next.push("note");
        next.push("review");
        setSteps(next);
      } catch (e) {
        if (e instanceof AuthError) return router.replace("/login");
        setLoadErr(e instanceof Error ? e.message : "Gagal memuat");
      }
    })();
  }, []);

  const step = steps[idx];
  const goNext = () => setIdx((i) => Math.min(i + 1, steps.length - 1));
  const goBack = () => (idx === 0 ? router.back() : setIdx((i) => i - 1));

  async function submit() {
    if (!ctx) return;
    setSubmitting(true);
    setSubmitErr(null);
    try {
      let photoUrl: string | null = null;
      if (ctx.validation?.photo && photoUri) photoUrl = await uploadSelfie(photoUri);
      const body = {
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        accuracy: gps?.accuracy ?? null,
        mocked: gps?.mocked ?? false,
        photoUrl,
        note: note.trim() || null,
      };
      if (action === "out") {
        const r = await submitClockOut(body);
        setDone({ label: "Clock-out berhasil", detail: r.workingHours != null ? `Jam kerja tercatat ${r.workingHours} jam` : "Sampai jumpa besok!" });
      } else {
        const r = await submitClockIn(body);
        setDone({ label: "Clock-in berhasil", detail: r.status === "LATE" ? "Tercatat: Terlambat" : "Tercatat: Tepat waktu" });
      }
    } catch (e) {
      if (e instanceof AuthError) return router.replace("/login");
      setSubmitErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal menyimpan kehadiran");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <Shell insets={insets} title="" onBack={null}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 18 }}>
          <View style={{ width: 88, height: 88, borderRadius: 28, backgroundColor: colors.mint[100], alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={44} color={colors.mint[700]} strokeWidth={2.5} />
          </View>
          <Txt size={20} weight="extrabold" color={colors.neutral[900]}>{done.label}</Txt>
          <Txt size={14} color={colors.neutral[500]} style={{ textAlign: "center" }}>{done.detail}</Txt>
          <Button label="Selesai" size="lg" full onPress={() => router.back()} style={{ marginTop: 8 }} />
        </View>
      </Shell>
    );
  }

  if (loadErr) {
    return (
      <Shell insets={insets} title="Kehadiran" onBack={() => router.back()}>
        <Center>
          <Txt size={14} color={colors.rose[700]} style={{ textAlign: "center" }}>{loadErr}</Txt>
        </Center>
      </Shell>
    );
  }
  if (!ctx) {
    return (
      <Shell insets={insets} title="Kehadiran" onBack={() => router.back()}>
        <Center><ActivityIndicator color={colors.brand[500]} /></Center>
      </Shell>
    );
  }

  // Tak boleh absen (libur / sudah selesai / belum jadwal)
  const blocked = action === "in" ? !ctx.clock?.canClockIn : !ctx.clock?.canClockOut;
  if (blocked) {
    return (
      <Shell insets={insets} title="Kehadiran" onBack={() => router.back()}>
        <Center>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.amber[100], alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Icon name="info" size={28} color={colors.amber[700]} strokeWidth={2} />
          </View>
          <Txt size={15} weight="bold" color={colors.neutral[800]} style={{ textAlign: "center" }}>
            {ctx.clock?.reason ?? "Belum bisa absen saat ini"}
          </Txt>
          <Button label="Kembali" variant="outline" size="md" onPress={() => router.back()} style={{ marginTop: 18 }} />
        </Center>
      </Shell>
    );
  }

  const title = action === "out" ? "Clock Out" : "Clock In";

  return (
    <Shell insets={insets} title={title} onBack={goBack} steps={steps.length} stepIdx={idx}>
      {step === "location" && (
        <LocationStep ctx={ctx} gps={gps} setGps={setGps} onNext={goNext} />
      )}
      {step === "face" && <FaceStep photoUri={photoUri} setPhotoUri={setPhotoUri} onNext={goNext} />}
      {step === "note" && <NoteStep note={note} setNote={setNote} onNext={goNext} />}
      {step === "review" && (
        <ReviewStep
          ctx={ctx}
          action={action}
          gps={gps}
          photoUri={photoUri}
          note={note}
          submitting={submitting}
          error={submitErr}
          onSubmit={submit}
        />
      )}
    </Shell>
  );
}

// ── Shell ────────────────────────────────────────────────────────────────────
function Shell({
  insets,
  title,
  onBack,
  steps,
  stepIdx,
  children,
}: {
  insets: { top: number; bottom: number };
  title: string;
  onBack: (() => void) | null;
  steps?: number;
  stepIdx?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top + 8 }}>
      <StatusBar style="dark" />
      <View style={{ height: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.neutral[100] }}>
            <Icon name="chevronLeft" size={20} color={colors.neutral[700]} strokeWidth={2} />
          </Pressable>
        ) : <View style={{ width: 38 }} />}
        <Txt size={16} weight="extrabold" color={colors.neutral[900]}>{title}</Txt>
        <View style={{ flex: 1 }} />
        {steps ? (
          <View style={{ flexDirection: "row", gap: 5 }}>
            {Array.from({ length: steps }).map((_, i) => (
              <View key={i} style={{ width: i === stepIdx ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === stepIdx ? colors.brand[500] : colors.neutral[200] }} />
            ))}
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, paddingBottom: insets.bottom + 12 }}>{children}</View>
    </View>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>{children}</View>;
}

// ── Step: Lokasi ──────────────────────────────────────────────────────────────
function LocationStep({
  ctx,
  gps,
  setGps,
  onNext,
}: {
  ctx: ClockContext;
  gps: GpsReading | null;
  setGps: (g: GpsReading | null) => void;
  onNext: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mapRef = useRef<ClockMapHandle>(null);

  const read = useCallback(async () => {
    setBusy(true);
    setErr(null);
    const r = await readLocation();
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      setGps(null);
      return;
    }
    setGps(r.reading);
  }, [setGps]);

  useEffect(() => {
    if (!gps) read();
  }, [gps, read]);

  // Kamera ikut titik terbaru begitu fix GPS tersedia/berubah.
  useEffect(() => {
    if (gps) mapRef.current?.recenter({ latitude: gps.latitude, longitude: gps.longitude });
  }, [gps]);

  const anywhere = ctx.location?.anywhere ?? false;
  const locs = ctx.location?.locations ?? [];
  // WFH tapi titik rumah belum diatur admin → bebas-lokasi + info ke user.
  const homeNotSet = ctx.location?.homeNotSet ?? false;

  // Titik acuan terdekat (kantor/rumah) + jaraknya.
  let nearestLoc: ClockLocation | null = null;
  let nearestDist: number | null = null;
  if (gps && !anywhere && locs.length > 0) {
    for (const l of locs) {
      const d = distanceMeters(gps.latitude, gps.longitude, l.latitude, l.longitude);
      if (nearestDist == null || d < nearestDist) {
        nearestDist = d;
        nearestLoc = l;
      }
    }
  }
  const radius = nearestLoc?.radius ?? locs[0]?.radius ?? 0;
  const withinRadius = anywhere || (nearestDist != null && nearestDist <= radius);
  // Hard-gate: hanya boleh lanjut bila ada fix, bukan GPS palsu, dan (bebas lokasi / dalam radius).
  const valid = !!gps && !gps.mocked && (anywhere || withinRadius);

  const isHome = nearestLoc?.kind === "home";
  const placeWord = isHome ? "rumah" : "kantor";

  // Banner status mengambang di atas peta.
  let banner: { tone: "mint" | "rose" | "amber"; text: string };
  if (busy && !gps) banner = { tone: "amber", text: "Membaca lokasi…" };
  else if (!gps) banner = { tone: "rose", text: err ?? "Lokasi belum terbaca" };
  else if (gps.mocked) banner = { tone: "rose", text: "Lokasi palsu (fake GPS) terdeteksi" };
  else if (homeNotSet) banner = { tone: "amber", text: "Lokasi rumah WFH belum diatur" };
  else if (anywhere) banner = { tone: "mint", text: "Bisa absen dari mana saja" };
  else if (withinRadius) banner = { tone: "mint", text: `Anda berada di area ${placeWord}` };
  else banner = { tone: "rose", text: `Di luar radius ${placeWord} (${Math.round(nearestDist ?? 0)} m)` };

  const offices = locs.map((l) => ({
    name: l.name,
    latitude: l.latitude,
    longitude: l.longitude,
    radius: l.radius,
    kind: l.kind,
  }));

  function recenter() {
    if (gps) mapRef.current?.recenter({ latitude: gps.latitude, longitude: gps.longitude });
    read();
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Area peta full-bleed + overlay mengambang */}
      <View style={{ flex: 1, position: "relative" }}>
        <ClockMap
          ref={mapRef}
          style={{ flex: 1 }}
          user={gps ? { latitude: gps.latitude, longitude: gps.longitude } : null}
          offices={offices}
        />

        {/* Banner status (atas) */}
        <View style={{ position: "absolute", top: 14, left: 16, right: 16, alignItems: "center" }}>
          <StatusBanner tone={banner.tone} text={banner.text} busy={busy} />
        </View>

        {/* Tombol re-center / refresh lokasi (kanan atas, di bawah tombol "3D" native) */}
        <Pressable
          onPress={recenter}
          hitSlop={8}
          style={{
            position: "absolute",
            right: 12,
            top: 60,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#fff",
            alignItems: "center",
            justifyContent: "center",
            ...shadows.elevated,
          }}
        >
          {busy ? (
            <ActivityIndicator color={colors.brand[500]} />
          ) : (
            <Icon name="target" size={22} color={colors.brand[600]} strokeWidth={2} />
          )}
        </Pressable>
      </View>

      {/* Kartu lokasi bawah */}
      <View
        style={{
          backgroundColor: "#fff",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          marginTop: -22,
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 6,
          gap: 14,
          ...shadows.elevated,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              backgroundColor: (homeNotSet ? colors.amber[500] : isHome ? colors.mint[500] : colors.brand[500]) + "14",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              name={homeNotSet ? "home" : anywhere ? "globe" : isHome ? "home" : "building"}
              size={20}
              color={homeNotSet ? colors.amber[700] : isHome ? colors.mint[500] : colors.brand[500]}
              strokeWidth={2}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Txt size={15} weight="extrabold" color={colors.neutral[900]}>
              {homeNotSet
                ? "Lokasi rumah belum diatur"
                : anywhere
                  ? "Bebas lokasi (WFA)"
                  : nearestLoc?.name ?? "Lokasi kehadiran"}
            </Txt>
            <Txt size={12} color={colors.neutral[500]} style={{ marginTop: 1 }} numberOfLines={2}>
              {homeNotSet
                ? "Shift WFH, namun titik rumah Anda belum disetel."
                : anywhere
                  ? "Shift ini boleh absen dari mana saja."
                  : nearestLoc?.address ?? "Alamat titik acuan belum diatur."}
            </Txt>
          </View>
        </View>

        {/* Info: WFH belum punya titik rumah → arahkan ke admin. */}
        {homeNotSet ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 8,
              padding: 11,
              borderRadius: 12,
              backgroundColor: colors.amber[100],
            }}
          >
            <Icon name="info" size={16} color={colors.amber[700]} strokeWidth={2} />
            <Txt size={11.5} color={colors.amber[700]} style={{ flex: 1, lineHeight: 16 }}>
              Hubungi admin/HR untuk menyetel lokasi rumah (WFH) Anda. Sementara ini Anda tetap bisa absen dari mana saja.
            </Txt>
          </View>
        ) : null}

        {/* Jarak + radius */}
        {!anywhere ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            {nearestDist != null ? (
              <Pill tone={withinRadius ? "mint" : "rose"}>
                {`~${Math.round(nearestDist)} m dari titik pusat`}
              </Pill>
            ) : null}
            <Pill tone="neutral">{`Radius ${radius} m`}</Pill>
          </View>
        ) : null}

        <Button label="Lanjutkan" size="lg" full disabled={!valid} onPress={onNext} />

        {/* Alasan tombol terkunci */}
        {!valid ? (
          <Txt size={11.5} color={colors.neutral[400]} style={{ textAlign: "center" }}>
            {!gps
              ? "Menunggu lokasi — tekan tombol pusatkan untuk mencoba lagi."
              : gps.mocked
                ? "Matikan aplikasi lokasi palsu lalu pusatkan ulang."
                : `Dekati titik ${placeWord} hingga masuk radius agar bisa lanjut.`}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

// Banner status mengambang di atas peta (pill lebar dgn titik indikator).
function StatusBanner({ tone, text, busy }: { tone: "mint" | "rose" | "amber"; text: string; busy?: boolean }) {
  const palette =
    tone === "mint"
      ? { bg: colors.mint[500], fg: "#fff" }
      : tone === "rose"
        ? { bg: colors.rose[500], fg: "#fff" }
        : { bg: colors.amber[500], fg: "#fff" };
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radii.pill,
        backgroundColor: palette.bg,
        maxWidth: "100%",
        ...shadows.elevated,
      }}
    >
      {busy ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.fg }} />
      )}
      <Txt size={12.5} weight="bold" color={palette.fg} numberOfLines={1}>
        {text}
      </Txt>
    </View>
  );
}

// Judul langkah dgn icon-badge (selaras Home/Profil).
function StepHeader({ icon, title, subtitle, accent = colors.brand[500] }: { icon: IconName; title: string; subtitle?: string; accent?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: accent + "14", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={20} color={accent} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt size={17} weight="extrabold" color={colors.neutral[900]}>{title}</Txt>
        {subtitle ? <Txt size={12.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>{subtitle}</Txt> : null}
      </View>
    </View>
  );
}

// Baris info dgn icon-badge + divider (gaya InfoRow Profil).
function InfoRow({ icon, label, value, accent = colors.neutral[400], valueColor, last }: { icon: IconName; label: string; value: string; accent?: string; valueColor?: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: last ? 0 : 1, borderColor: colors.neutral[100] }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: accent + "1A", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={16} color={accent} strokeWidth={2} />
      </View>
      <Txt size={12.5} color={colors.neutral[500]} style={{ flex: 1 }}>{label}</Txt>
      <Txt size={13} weight="bold" color={valueColor ?? colors.neutral[800]} style={{ maxWidth: "52%", textAlign: "right" }}>{value}</Txt>
    </View>
  );
}

// ── Step: Wajah (swafoto) ──────────────────────────────────────────────────────
function FaceStep({ photoUri, setPhotoUri, onNext }: { photoUri: string | null; setPhotoUri: (u: string | null) => void; onNext: () => void }) {
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain) requestPerm();
  }, [perm, requestPerm]);

  async function capture() {
    if (!camRef.current || capturing) return;
    setCapturing(true);
    try {
      const pic = await camRef.current.takePictureAsync({ quality: 0.5 });
      if (pic?.uri) setPhotoUri(pic.uri);
    } finally {
      setCapturing(false);
    }
  }

  if (!perm) return <Center><ActivityIndicator color={colors.brand[500]} /></Center>;
  if (!perm.granted) {
    return (
      <Center>
        <Txt size={14} color={colors.neutral[600]} style={{ textAlign: "center", marginBottom: 16 }}>
          Izinkan akses kamera untuk swafoto kehadiran.
        </Txt>
        <Button label="Izinkan Kamera" size="md" onPress={requestPerm} />
      </Center>
    );
  }

  // Bingkai lingkaran "Pindai Wajah" (selaras desain Corelia FaceIdScreen).
  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[900], padding: 20, alignItems: "center" }}>
      <Txt size={18} weight="extrabold" color="#fff" style={{ marginTop: 4 }}>Pindai Wajah</Txt>
      <Txt size={13} color="rgba(255,255,255,0.7)" style={{ textAlign: "center", marginTop: 6 }}>
        Posisikan wajah dalam lingkaran lalu ambil foto.
      </Txt>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", width: "100%" }}>
        <View
          style={{
            width: 260,
            height: 260,
            borderRadius: 130,
            overflow: "hidden",
            borderWidth: 4,
            borderColor: photoUri ? colors.mint[500] : colors.brand[400],
            backgroundColor: "#000",
          }}
        >
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="cover" />
          ) : (
            <CameraView ref={camRef} style={{ flex: 1 }} facing="front" />
          )}
        </View>
      </View>
      {photoUri ? (
        <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
          <Button label="Ulangi" variant="outline" size="md" onPress={() => setPhotoUri(null)} style={{ flex: 1 }} />
          <Button label="Lanjut" size="md" onPress={onNext} style={{ flex: 1 }} />
        </View>
      ) : (
        <Button label={capturing ? "Mengambil…" : "Ambil Foto"} size="lg" full onPress={capture} left={<Icon name="camera" size={18} color="#fff" strokeWidth={2} />} />
      )}
    </View>
  );
}

// ── Step: Catatan ──────────────────────────────────────────────────────────────
function NoteStep({ note, setNote, onNext }: { note: string; setNote: (s: string) => void; onNext: () => void }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <StepHeader icon="doc" title="Catatan (opsional)" subtitle="Mis. alasan keterlambatan atau keterangan lain." accent={colors.coral[500]} />
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Tulis catatan…"
        placeholderTextColor={colors.neutral[300]}
        multiline
        style={{
          minHeight: 120,
          backgroundColor: "#fff",
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.neutral[100],
          padding: 14,
          fontSize: 14,
          fontFamily: fonts.regular,
          color: colors.neutral[800],
          textAlignVertical: "top",
        }}
      />
      <Button label="Lanjut" size="md" full onPress={onNext} />
    </ScrollView>
  );
}

// ── Step: Tinjau & konfirmasi ────────────────────────────────────────────────
function ReviewStep({
  ctx,
  action,
  gps,
  photoUri,
  note,
  submitting,
  error,
  onSubmit,
}: {
  ctx: ClockContext;
  action: "in" | "out";
  gps: GpsReading | null;
  photoUri: string | null;
  note: string;
  submitting: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  const v = ctx.validation;
  const lastIsNote = !!note.trim();
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <StepHeader
        icon="check"
        title={`Tinjau ${action === "out" ? "Clock Out" : "Clock In"}`}
        subtitle="Pastikan data benar sebelum dikirim."
        accent={action === "out" ? colors.rose[500] : colors.brand[500]}
      />

      <Card pad={0} radius={18}>
        <InfoRow icon="briefcase" accent={colors.brand[500]} label="Shift" value={ctx.shift?.name ?? "—"} last={!v?.gps && !v?.photo && !lastIsNote} />
        {v?.gps ? (
          <InfoRow
            icon="mapPin"
            accent={colors.mint[500]}
            label="Lokasi"
            value={gps ? `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}` : "—"}
            last={!v?.photo && !lastIsNote}
          />
        ) : null}
        {v?.photo ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: lastIsNote ? 1 : 0, borderColor: colors.neutral[100] }}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.coral[500] + "1A", alignItems: "center", justifyContent: "center" }}>
              <Icon name="camera" size={16} color={colors.coral[500]} strokeWidth={2} />
            </View>
            <Txt size={12.5} color={colors.neutral[500]} style={{ flex: 1 }}>Swafoto</Txt>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ width: 40, height: 40, borderRadius: 10 }} />
            ) : (
              <Txt size={12.5} weight="bold" color={colors.rose[700]}>Belum ada</Txt>
            )}
          </View>
        ) : null}
        {lastIsNote ? <InfoRow icon="doc" accent={colors.neutral[500]} label="Catatan" value={note.trim()} last /> : null}
      </Card>

      {error ? (
        <View style={{ alignItems: "center" }}>
          <Pill tone="rose">{error}</Pill>
        </View>
      ) : null}

      <Button
        label={submitting ? "Menyimpan…" : action === "out" ? "Konfirmasi Clock Out" : "Konfirmasi Clock In"}
        variant={action === "out" ? "danger" : "primary"}
        size="lg"
        full
        onPress={submitting ? undefined : onSubmit}
        style={{ opacity: submitting ? 0.7 : 1 }}
      />
    </ScrollView>
  );
}
