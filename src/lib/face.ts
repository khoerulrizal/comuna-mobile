// Pendaftaran wajah (Fase 2, on-device) — hitung embedding di perangkat, kirim
// vektornya ke server. Foto wajah TIDAK diunggah/disimpan.
import { api } from "./api";
import { computeFaceEmbedding } from "./face-embed";

/**
 * Daftarkan/ganti wajah referensi: hitung embedding dari foto lalu simpan di
 * server. Melempar bila modul wajah on-device belum siap atau wajah tak jelas.
 */
export async function enrollFace(uri: string): Promise<{ enrolled: boolean; enrolledAt: string | null }> {
  const embedding = await computeFaceEmbedding(uri);
  if (!embedding) {
    throw new Error(
      "Pengenalan wajah belum siap di aplikasi ini (model wajah belum dipasang) atau wajah tidak terdeteksi. Hubungi admin/pengembang.",
    );
  }
  return api<{ enrolled: boolean; enrolledAt: string | null }>("/api/v1/profile/face", {
    method: "POST",
    auth: true,
    body: { embedding },
  });
}

/** Hapus pendaftaran wajah. */
export async function deleteFace(): Promise<{ enrolled: boolean }> {
  return api<{ enrolled: boolean }>("/api/v1/profile/face", { method: "DELETE", auth: true });
}
