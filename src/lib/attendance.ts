// Kehadiran (clock-in/out) — context + lokasi (anti fake-GPS) + unggah swafoto + submit.
import * as Location from "expo-location";
import { getInfoAsync, uploadAsync, FileSystemUploadType } from "expo-file-system/legacy";
import { api } from "./api";

export type AttendanceStatus = "BEFORE_CLOCKIN" | "CLOCKED_IN" | "DONE";

export interface ClockLocation {
  branchId: string;
  /** "office" = cabang kantor, "home" = titik rumah karyawan (WFH). */
  kind: "office" | "home";
  name: string;
  /** Alamat utk ditampilkan (opsional). */
  address: string | null;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface ClockContext {
  shift: {
    id: string;
    name: string;
    isWorkingDay: boolean;
    holidayName: string | null;
    startTime: string | null; // "HH:mm"
    endTime: string | null;
    startMin: number | null; // menit-dari-tengah-malam (zona shift)
    endMin: number | null;
    locationType: string;
  } | null;
  employee: {
    fullName: string;
    position: string | null;
    department: string | null;
    photoUrl: string | null;
  } | null;
  validation: { gps: boolean; photo: boolean; fingerprint: boolean; none: boolean } | null;
  location: {
    anywhere: boolean;
    locations: ClockLocation[];
    /** WFH tapi titik rumah belum diatur → bebas-lokasi + perlu info ke user. */
    homeNotSet?: boolean;
    /** Tipe lokasi shift: "WFO" | "WFH" | "WFA" | "MULTIPLE". */
    mode?: string;
  } | null;
  clock: {
    clockIn: string | null;
    clockOut: string | null;
    attendanceStatus: AttendanceStatus;
    canClockIn: boolean;
    canClockOut: boolean;
    reason: string | null;
  } | null;
  timezone: string;
  tzOffsetMinutes: number;
  tzAbbr: string | null;
}

export async function getClockContext(): Promise<ClockContext> {
  return api<ClockContext>("/api/v1/attendance/context", { auth: true });
}

export interface GpsReading {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  mocked: boolean;
}

/** Baca lokasi sekarang + flag mock (Android). */
export async function readLocation(): Promise<
  { ok: true; reading: GpsReading } | { ok: false; error: string }
> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== "granted") {
    return { ok: false, error: "Izin lokasi ditolak. Aktifkan di Pengaturan." };
  }
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return {
      ok: true,
      reading: {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
        // `mocked` tersedia di Android; iOS undefined → false.
        mocked: (loc as { mocked?: boolean }).mocked === true,
      },
    };
  } catch {
    return { ok: false, error: "Gagal membaca lokasi. Coba lagi di area terbuka." };
  }
}

/** Jarak antar 2 koordinat (meter) — utk hint UX (server tetap otoritas). */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Unggah swafoto ke Spaces via presigned PUT; kembalikan URL CDN publik.
 * Pakai expo-file-system `uploadAsync` (PUT biner langsung dari file URI) — RN/Hermes
 * tak mendukung pembuatan Blob dari ArrayBuffer, jadi pola fetch(uri).blob() gagal.
 */
export async function uploadSelfie(uri: string): Promise<string> {
  const info = await getInfoAsync(uri);
  const size = info.exists ? info.size : 0;
  const presign = await api<{ uploadUrl: string; fileUrl: string; headers: Record<string, string> }>(
    "/api/v1/uploads/presign",
    {
      method: "POST",
      auth: true,
      body: { folder: "evidence", contentType: "image/jpeg", fileName: "selfie.jpg", size },
    },
  );
  const res = await uploadAsync(presign.uploadUrl, uri, {
    httpMethod: "PUT",
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": "image/jpeg", ...presign.headers },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Gagal mengunggah swafoto (HTTP ${res.status})`);
  }
  return presign.fileUrl;
}

export interface ClockSubmit {
  latitude?: number;
  longitude?: number;
  accuracy?: number | null;
  mocked?: boolean;
  photoUrl?: string | null;
  note?: string | null;
}

export async function submitClockIn(body: ClockSubmit) {
  return api<{ success: boolean; clockIn: string | null; status: string }>(
    "/api/v1/attendance/clock-in",
    { method: "POST", auth: true, body },
  );
}

export async function submitClockOut(body: ClockSubmit) {
  return api<{ success: boolean; clockOut: string | null; workingHours: number | null }>(
    "/api/v1/attendance/clock-out",
    { method: "POST", auth: true, body },
  );
}
