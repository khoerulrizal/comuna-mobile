// Flow clock-in/out — lokasi → wajah(swafoto) → catatan → tinjau → sukses.
// Langkah menyesuaikan validationTypes shift. Validasi final tetap di server.
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, TextInput, View, type ViewStyle } from "react-native";
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
import { liveClock, dateLabel, timeHMS } from "@/lib/home";
import { computeFaceEmbedding } from "@/lib/face-embed";

// Menit-dari-tengah-malam (zona ber-offset) dari sebuah ISO; null bila kosong.
function isoToMinutes(iso: string | null, offsetMin: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t + offsetMin * 60000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// "Tepat waktu" / "Terlambat N menit" / "N menit lebih awal" relatif jam mulai shift.
function punctuality(recordedMin: number | null, startMin: number | null): { text: string; tone: "mint" | "rose" | "amber" } {
  if (recordedMin == null || startMin == null) return { text: "Tercatat", tone: "mint" };
  const diff = recordedMin - startMin;
  if (diff <= 0) return { text: diff === 0 ? "Tepat waktu" : `${-diff} menit lebih awal`, tone: "mint" };
  return { text: `Terlambat ${diff} menit`, tone: diff <= 5 ? "amber" : "rose" };
}

// Menit → "1 jam 30 menit" / "2 jam" / "45 menit".
function fmtHM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0 && m > 0) return `${h} jam ${m} menit`;
  if (h > 0) return `${h} jam`;
  return `${m} menit`;
}

// Status pulang relatif jam selesai shift: lebih awal / lembur / tepat.
function leaveTiming(recordedMin: number | null, endMin: number | null): { text: string; tone: "mint" | "rose" | "amber" } {
  if (recordedMin == null || endMin == null) return { text: "Tercatat", tone: "mint" };
  let diff = recordedMin - endMin;
  if (diff < -720) diff += 1440; // pulang lewat tengah malam (shift malam)
  if (diff === 0) return { text: "Tepat jam pulang", tone: "mint" };
  if (diff < 0) return { text: `Pulang ${fmtHM(-diff)} lebih awal`, tone: diff >= -15 ? "amber" : "rose" };
  return { text: `Lembur ${fmtHM(diff)}`, tone: "mint" };
}

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
  const [done, setDone] = useState<null | {
    kind: "in" | "out";
    iso: string | null;
    status: string | null;
    workingHours: number | null;
    faceMatch: { score: number | null; passed: boolean } | null;
  }>(null);

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
      // Pencocokan wajah on-device: hitung embedding dari swafoto (bila fitur aktif).
      let faceEmbedding: number[] | null = null;
      if (ctx.face?.required && photoUri) faceEmbedding = await computeFaceEmbedding(photoUri);
      const body = {
        latitude: gps?.latitude,
        longitude: gps?.longitude,
        accuracy: gps?.accuracy ?? null,
        mocked: gps?.mocked ?? false,
        photoUrl,
        note: note.trim() || null,
        faceEmbedding,
      };
      if (action === "out") {
        const r = await submitClockOut(body);
        setDone({ kind: "out", iso: r.clockOut, status: null, workingHours: r.workingHours, faceMatch: r.faceMatch });
      } else {
        const r = await submitClockIn(body);
        setDone({ kind: "in", iso: r.clockIn, status: r.status, workingHours: null, faceMatch: r.faceMatch });
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
    const off = ctx?.tzOffsetMinutes ?? 0;
    const tzAbbr = ctx?.tzAbbr ?? "";
    const recordedTime = timeHMS(done.iso, off); // "HH:mm:ss"
    const recordedDate = done.iso ? dateLabel(Date.parse(done.iso), off) : null;
    const isOut = done.kind === "out";
    // Tema: hijau utk clock-in, merah utk clock-out.
    const theme = isOut
      ? { tint: colors.rose[500], badgeBg: colors.rose[100], badgeFg: colors.rose[700] }
      : { tint: colors.mint[500], badgeBg: colors.mint[100], badgeFg: colors.mint[700] };

    // Timing: clock-in vs jam datang, clock-out vs jam pulang.
    const recMin = isoToMinutes(done.iso, off);
    const timing = isOut
      ? leaveTiming(recMin, ctx?.shift?.endMin ?? null)
      : punctuality(recMin, ctx?.shift?.startMin ?? null);

    // Durasi hadir (clock-out): dari jam datang (clock-in) ke clock-out.
    let workedLabel: string | null = null;
    if (isOut && done.iso && ctx?.clock?.clockIn) {
      const ms = Date.parse(done.iso) - Date.parse(ctx.clock.clockIn);
      if (!Number.isNaN(ms) && ms > 0) workedLabel = fmtHM(Math.round(ms / 60000));
    }

    const emp = ctx?.employee;
    const empMeta = [emp?.department, emp?.position].filter(Boolean).join(" · ");

    return (
      <Shell insets={insets} title="" onBack={null}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 12 }}>
          <View style={{ width: 92, height: 92, borderRadius: 30, backgroundColor: theme.badgeBg, alignItems: "center", justifyContent: "center" }}>
            <Icon name="check" size={46} color={theme.badgeFg} strokeWidth={2.5} />
          </View>
          <Txt size={21} weight="extrabold" color={colors.neutral[900]} style={{ textAlign: "center" }}>
            {isOut ? "Clock Out Berhasil" : "Clock In Berhasil"}
          </Txt>

          {/* Identitas */}
          {emp?.fullName ? (
            <View style={{ alignItems: "center", gap: 1 }}>
              <Txt size={15} weight="bold" color={colors.neutral[800]} style={{ textAlign: "center" }}>{emp.fullName}</Txt>
              {empMeta ? <Txt size={12} color={colors.neutral[400]} style={{ textAlign: "center" }}>{empMeta}</Txt> : null}
            </View>
          ) : null}

          {recordedDate ? (
            <Txt size={13} color={colors.neutral[500]} style={{ textAlign: "center" }}>{recordedDate}</Txt>
          ) : null}

          {/* Waktu terekam jam:menit:detik */}
          <View style={{ alignItems: "center", marginTop: 2 }}>
            <Txt size={12} color={colors.neutral[400]} style={{ textAlign: "center" }}>Waktu terekam</Txt>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
              <Txt size={40} weight="extrabold" color={theme.tint}>{recordedTime ?? "—"}</Txt>
              {tzAbbr ? <Txt size={14} weight="bold" color={colors.neutral[400]} style={{ marginBottom: 7 }}>{tzAbbr}</Txt> : null}
            </View>
          </View>

          {/* Timing relatif shift */}
          <Pill tone={timing.tone} style={{ alignSelf: "center" }}>{timing.text}</Pill>

          {/* Hasil pencocokan wajah (bila dijalankan) */}
          {done.faceMatch ? (
            <Pill tone={done.faceMatch.passed ? "mint" : "amber"} style={{ alignSelf: "center" }}>
              {done.faceMatch.passed ? "Wajah cocok" : "Wajah perlu ditinjau HR"}
            </Pill>
          ) : null}

          {/* Durasi hadir (clock-out) */}
          {workedLabel ? (
            <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>
              {`Durasi hadir ${workedLabel} sejak jam datang`}
            </Txt>
          ) : null}

          <Button
            label="Kembali ke Home"
            size="lg"
            full
            variant={isOut ? "danger" : "primary"}
            onPress={() => router.back()}
            left={<Icon name="home" size={18} color="#fff" strokeWidth={2} />}
            style={{ marginTop: 14 }}
          />
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
      {step === "face" && <FaceStep photoUri={photoUri} setPhotoUri={setPhotoUri} onNext={goNext} tzOffset={ctx.tzOffsetMinutes} tzAbbr={ctx.tzAbbr} faceRequired={!!ctx.face?.required} faceEnrolled={!!ctx.face?.enrolled} />}
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
              <View key={i} style={{ width: 22, height: 5, borderRadius: 3, backgroundColor: i <= (stepIdx ?? 0) ? colors.brand[500] : colors.neutral[200] }} />
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

        {/* Tombol re-center / refresh lokasi (kanan atas — menggantikan tombol "3D" native) */}
        <Pressable
          onPress={recenter}
          hitSlop={8}
          style={{
            position: "absolute",
            right: 12,
            top: 14,
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


// ── Step: Wajah (swafoto) ──────────────────────────────────────────────────────
function FaceStep({ photoUri, setPhotoUri, onNext, tzOffset, tzAbbr, faceRequired, faceEnrolled }: { photoUri: string | null; setPhotoUri: (u: string | null) => void; onNext: () => void; tzOffset: number; tzAbbr: string | null; faceRequired: boolean; faceEnrolled: boolean }) {
  const [perm, requestPerm] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);
  // Waktu pengambilan swafoto (epoch) — ditampilkan dalam zona shift sbg bukti.
  const [capturedAt, setCapturedAt] = useState<number | null>(null);

  useEffect(() => {
    if (perm && !perm.granted && perm.canAskAgain) requestPerm();
  }, [perm, requestPerm]);

  // Pencocokan wajah wajib tapi belum daftar → arahkan ke pendaftaran di Profil.
  if (faceRequired && !faceEnrolled) {
    return (
      <Center>
        <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Icon name="camera" size={34} color={colors.brand[500]} strokeWidth={2} />
        </View>
        <Txt size={16} weight="bold" color={colors.neutral[900]} style={{ textAlign: "center", marginBottom: 6 }}>
          Daftarkan wajah dulu
        </Txt>
        <Txt size={13} color={colors.neutral[500]} style={{ textAlign: "center", marginBottom: 18 }}>
          Absensi di perusahaan Anda memakai verifikasi wajah. Daftarkan wajah referensi sekali lewat menu Profil sebelum melanjutkan.
        </Txt>
        <Button label="Daftarkan Wajah" size="md" onPress={() => router.push("/face-enroll")} left={<Icon name="camera" size={16} color="#fff" strokeWidth={2} />} />
      </Center>
    );
  }

  // Reset stempel waktu bila foto dihapus (Ulangi).
  useEffect(() => {
    if (!photoUri) setCapturedAt(null);
  }, [photoUri]);

  async function capture() {
    if (!camRef.current || capturing) return;
    setCapturing(true);
    try {
      const pic = await camRef.current.takePictureAsync({ quality: 0.5 });
      if (pic?.uri) {
        setCapturedAt(Date.now());
        setPhotoUri(pic.uri);
      }
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

  // Layar "Ambil swafoto": bingkai bulat + corner bracket, shutter putih, badge wajah.
  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[900], paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22 }}>
      <Txt size={20} weight="extrabold" color="#fff" style={{ textAlign: "center", alignSelf: "stretch" }}>Ambil swafoto</Txt>

      {/* Instruksi atas (sebelum ambil) */}
      <View style={{ alignItems: "center", marginTop: 14, height: 34 }}>
        {!photoUri ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.08)" }}>
            <Icon name="info" size={14} color="rgba(255,255,255,0.85)" strokeWidth={2} />
            <Txt size={12.5} color="rgba(255,255,255,0.85)">Posisikan wajah dalam bingkai</Txt>
          </View>
        ) : null}
      </View>

      {/* Bingkai kamera + corner bracket */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 286, height: 286, alignItems: "center", justifyContent: "center" }}>
          <View
            style={{
              width: 256,
              height: 256,
              borderRadius: 128,
              overflow: "hidden",
              backgroundColor: "#000",
            }}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="cover" />
            ) : (
              <CameraView ref={camRef} style={{ flex: 1 }} facing="front" />
            )}
          </View>
          {/* Cincin dashed */}
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
          {/* Corner bracket */}
          <CornerBracket pos="tl" color={colors.brand[400]} />
          <CornerBracket pos="tr" color={colors.brand[400]} />
          <CornerBracket pos="bl" color={colors.brand[400]} />
          <CornerBracket pos="br" color={colors.brand[400]} />
        </View>

        {/* Badge "Wajah terdeteksi" + stempel waktu zona shift (muncul setelah ambil) */}
        <View style={{ minHeight: 52, marginTop: 14, alignItems: "center", justifyContent: "center", gap: 6 }}>
          {photoUri ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.mint[500] }}>
                <Icon name="check" size={15} color="#fff" strokeWidth={2.5} />
                <Txt size={12.5} weight="bold" color="#fff">Wajah terdeteksi</Txt>
              </View>
              {capturedAt != null ? (
                <Txt size={10.5} color="rgba(255,255,255,0.6)" style={{ textAlign: "center" }}>
                  {`${dateLabel(capturedAt, tzOffset)} · ${liveClock(capturedAt, tzOffset)}${tzAbbr ? " " + tzAbbr : ""}`}
                </Txt>
              ) : null}
            </>
          ) : null}
        </View>
      </View>

      {/* Kontrol bawah */}
      {photoUri ? (
        <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
          <Button label="Ulangi" variant="outline" size="lg" onPress={() => setPhotoUri(null)} style={{ flex: 1 }} />
          <Button label="Lanjut" size="lg" onPress={onNext} style={{ flex: 1 }} />
        </View>
      ) : (
        <View style={{ alignItems: "center" }}>
          <Pressable
            onPress={capture}
            disabled={capturing}
            hitSlop={10}
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              borderWidth: 5,
              borderColor: "rgba(255,255,255,0.45)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              {capturing ? <ActivityIndicator color={colors.brand[500]} /> : null}
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Corner bracket sudut bingkai swafoto.
function CornerBracket({ pos, color }: { pos: "tl" | "tr" | "bl" | "br"; color: string }) {
  const s = 26;
  const base: ViewStyle = { position: "absolute", width: s, height: s, borderColor: color };
  const corner: Record<typeof pos, ViewStyle> = {
    tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 14 },
    tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 14 },
    bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 14 },
    br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 14 },
  };
  return <View pointerEvents="none" style={[base, corner[pos]]} />;
}

// ── Step: Catatan ──────────────────────────────────────────────────────────────
const NOTE_SUGGESTIONS = ["Meeting klien", "WFH", "Di luar kota", "Training", "Site visit"];

function NoteStep({ note, setNote, onNext }: { note: string; setNote: (s: string) => void; onNext: () => void }) {
  // Tambahkan saran ke catatan (hindari duplikat, sisipkan dengan pemisah).
  function addSuggestion(s: string) {
    const cur = note.trim();
    if (cur.length === 0) return setNote(s);
    if (cur.toLowerCase().includes(s.toLowerCase())) return;
    setNote(`${cur}, ${s}`);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View>
          <Txt size={20} weight="extrabold" color={colors.neutral[900]}>Tambahkan catatan</Txt>
          <Txt size={12.5} color={colors.neutral[500]} style={{ marginTop: 4, lineHeight: 18 }}>
            Opsional. Tambahkan catatan bila perlu, misalnya lokasi kerja di luar kantor atau agenda khusus hari ini.
          </Txt>
        </View>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Hari ini akan meeting dengan vendor di BSD pukul 14:00. Sore kembali ke kantor untuk design review."
          placeholderTextColor={colors.neutral[300]}
          multiline
          style={{
            minHeight: 130,
            backgroundColor: "#fff",
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.neutral[100],
            padding: 14,
            fontSize: 14,
            fontFamily: fonts.regular,
            color: colors.neutral[800],
            textAlignVertical: "top",
            ...shadows.card,
          }}
        />

        <View>
          <Txt size={11} weight="bold" color={colors.neutral[400]} style={{ letterSpacing: 0.5, marginBottom: 10 }}>
            SARAN CEPAT
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {NOTE_SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => addSuggestion(s)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                  backgroundColor: "#fff",
                }}
              >
                <Txt size={12.5} weight="semibold" color={colors.neutral[700]}>{s}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer tombol tetap di bawah (konsisten dgn langkah Lokasi) */}
      <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6, backgroundColor: colors.neutral[25], borderTopWidth: 1, borderColor: colors.neutral[100] }}>
        <Button label="Lewati" variant="outline" size="lg" onPress={() => { setNote(""); onNext(); }} style={{ flex: 1 }} />
        <Button label="Lanjut" size="lg" onPress={onNext} style={{ flex: 1 }} />
      </View>
    </View>
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
  const off = ctx.tzOffsetMinutes;
  const headerColor = action === "out" ? colors.rose[500] : colors.brand[500];

  // Jam berjalan (zona shift) — tik tiap detik.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const clockStr = liveClock(now, off).slice(0, 5); // "HH:mm"
  const dateStr = dateLabel(now, off);
  let localMin = Math.floor(now / 60000 + off) % 1440;
  if (localMin < 0) localMin += 1440;
  const punct = punctuality(localMin, ctx.shift?.startMin ?? null);
  const startTime = ctx.shift?.startTime;
  const endTime = ctx.shift?.endTime;
  const shiftWindow = startTime && endTime ? `${startTime} - ${endTime}` : null;

  // Lokasi acuan terdekat (untuk baris Lokasi).
  const anywhere = ctx.location?.anywhere ?? false;
  const homeNotSet = ctx.location?.homeNotSet ?? false;
  const mode = ctx.location?.mode;
  let nearestName: string | null = null;
  let nearestDist: number | null = null;
  if (gps && !anywhere) {
    for (const l of ctx.location?.locations ?? []) {
      const d = distanceMeters(gps.latitude, gps.longitude, l.latitude, l.longitude);
      if (nearestDist == null || d < nearestDist) { nearestDist = d; nearestName = l.name; }
    }
  }
  const locValue = anywhere
    ? homeNotSet ? "Rumah (belum diatur)" : mode === "WFH" ? "Di rumah" : "Di mana saja"
    : nearestName ?? "—";
  const locSub = !anywhere && nearestDist != null ? `~${Math.round(nearestDist)} m dari titik pusat` : null;

  const emp = ctx.employee;
  const initials = (emp?.fullName ?? "")
    .split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "—";
  const noteText = note.trim();

  const headerPillText =
    action === "in"
      ? shiftWindow ? `${punct.text} · shift ${shiftWindow}` : punct.text
      : shiftWindow ? `Shift ${shiftWindow}` : "";

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Txt size={20} weight="extrabold" color={colors.neutral[900]}>Tinjau & konfirmasi</Txt>

      {/* Header: identitas + jam berjalan + status */}
      <View style={{ borderRadius: 22, backgroundColor: headerColor, padding: 18, gap: 12, ...shadows.elevated }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
          {emp?.photoUrl ? (
            <Image source={{ uri: emp.photoUrl }} style={{ width: 40, height: 40, borderRadius: 12 }} />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
              <Txt size={14} weight="extrabold" color="#fff">{initials}</Txt>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Txt size={14} weight="bold" color="#fff" numberOfLines={1}>{emp?.fullName ?? "Karyawan"}</Txt>
            <Txt size={11.5} color="rgba(255,255,255,0.75)" numberOfLines={1}>{emp?.position ?? "—"}</Txt>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 7 }}>
          <Txt size={38} weight="extrabold" color="#fff">{clockStr}</Txt>
          {ctx.tzAbbr ? <Txt size={14} weight="bold" color="rgba(255,255,255,0.75)" style={{ marginBottom: 7 }}>{ctx.tzAbbr}</Txt> : null}
        </View>
        <Txt size={12} color="rgba(255,255,255,0.8)">{dateStr}</Txt>

        {headerPillText ? (
          <View style={{ flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.18)" }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" }} />
            <Txt size={12} weight="bold" color="#fff">{headerPillText}</Txt>
          </View>
        ) : null}
      </View>

      {/* Rincian */}
      <Card pad={0} radius={18}>
        {v?.gps ? (
          <ReviewRow icon="mapPin" accent={colors.mint[500]} label="Lokasi" value={locValue} sub={locSub} />
        ) : null}
        {v?.photo ? (
          <ReviewRow
            icon="camera"
            accent={colors.coral[500]}
            label="Swafoto"
            value="Verified"
            valueColor={colors.mint[700]}
            right={photoUri ? <Image source={{ uri: photoUri }} style={{ width: 40, height: 40, borderRadius: 10 }} /> : undefined}
          />
        ) : null}
        {noteText ? <ReviewRow icon="doc" accent={colors.neutral[500]} label="Catatan" value={noteText} /> : null}
        <ReviewRow
          icon="clock"
          accent={colors.brand[500]}
          label="Shift"
          value={shiftWindow ? `${shiftWindow} · ${ctx.shift?.name ?? ""}`.trim() : ctx.shift?.name ?? "—"}
          sub={mode ? `${nearestName ? nearestName + " " : ""}(${mode})` : null}
          last
        />
      </Card>

      {/* Catatan keamanan */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9, paddingHorizontal: 4 }}>
        <Icon name="shield" size={15} color={colors.neutral[400]} strokeWidth={2} />
        <Txt size={11.5} color={colors.neutral[400]} style={{ flex: 1, lineHeight: 16 }}>
          Data kehadiran terenkripsi dan hanya digunakan untuk verifikasi kehadiran. Anda dapat meminta koreksi bila ada kesalahan.
        </Txt>
      </View>

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
        disabled={submitting}
        onPress={onSubmit}
      />
    </ScrollView>
  );
}

// Baris rincian tinjau: icon-badge + label kecil + nilai (opsional sub & elemen kanan).
function ReviewRow({ icon, accent, label, value, sub, valueColor, right, last }: {
  icon: IconName; accent: string; label: string; value: string; sub?: string | null; valueColor?: string; right?: React.ReactNode; last?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: last ? 0 : 1, borderColor: colors.neutral[100] }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: accent + "1A", alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={16} color={accent} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt size={11.5} color={colors.neutral[400]}>{label}</Txt>
        <Txt size={13.5} weight="bold" color={valueColor ?? colors.neutral[800]} numberOfLines={2}>{value}</Txt>
        {sub ? <Txt size={11} color={colors.neutral[400]} style={{ marginTop: 1 }}>{sub}</Txt> : null}
      </View>
      {right}
    </View>
  );
}
