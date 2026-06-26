// =============================================================================
// Embedding wajah ON-DEVICE (Fase 2). Hitung vektor embedding dari foto wajah
// memakai model TFLite (MobileFaceNet/FaceNet) DI PERANGKAT — tanpa cloud,
// tanpa ML Kit/library Google. Server hanya membandingkan embedding (cosine).
//
// Pipeline: crop kotak TENGAH (mengikuti bingkai bulat di layar ambil wajah) →
// resize ke input model (expo-image-manipulator) → decode piksel (jpeg-js) →
// normalisasi → inferensi TFLite → L2-normalize. TIDAK ada deteksi wajah —
// user diminta menaruh wajah di tengah bingkai. TIDAK pernah melempar →
// kegagalan apa pun (model/decode) mengembalikan null (fitur skip aman).
//
// ⚠️ WAJIB: taruh model asli di `assets/models/mobilefacenet.tflite`
//    (lihat assets/models/README.md). File yang ada sekarang PLACEHOLDER →
//    pemuatan model gagal → enroll menampilkan pesan "belum siap".
//    Butuh DEV BUILD + HP fisik (tak jalan di Expo Go).
// =============================================================================
import { loadTensorflowModel, type TensorflowModel } from "react-native-fast-tflite";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { decode as decodeJpeg } from "jpeg-js";

// Model di-bundle sebagai aset (metro: assetExts += 'tflite').
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MODEL_SOURCE = require("../../assets/models/mobilefacenet.tflite");

// ── Mode preprocessing — SESUAIKAN dengan model yang dipakai ─────────────────
//  "mobilefacenet" → input (x-127.5)/128   (MobileFaceNet, biasanya 112x112, 192-d)
//  "facenet"       → prewhiten per-gambar   (FaceNet/deepface, biasanya 160x160, 128/512-d)
// Ukuran input (112/160) & dimensi output dibaca OTOMATIS dari model.
export const FACE_MODEL_PREPROCESS: "mobilefacenet" | "facenet" = "mobilefacenet";

// Porsi sisi gambar yang diambil sebagai kotak tengah (mengikuti bingkai bulat
// pada layar ambil wajah). 0.85 = ambil 85% sisi terpendek, terpusat.
const CENTER_CROP_RATIO = 0.85;

let _modelPromise: Promise<TensorflowModel> | null = null;
function getModel(): Promise<TensorflowModel> {
  if (!_modelPromise) {
    _modelPromise = loadTensorflowModel(MODEL_SOURCE, []).catch((e) => {
      _modelPromise = null; // izinkan retry di pemanggilan berikutnya
      throw e;
    });
  }
  return _modelPromise;
}

/** Ukuran sisi input model (px). Dibaca dari shape model, fallback 112. */
function inputSize(model: TensorflowModel): number {
  const shape = model.inputs[0]?.shape; // [1, H, W, 3]
  const h = shape?.[1];
  return typeof h === "number" && h > 0 ? h : 112;
}

/** Base64 → Uint8Array (tanpa dependensi; aman di Hermes). */
function base64ToBytes(b64: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, "");
  const len = clean.length;
  const pad = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const outLen = Math.floor((len * 3) / 4) - pad;
  const out = new Uint8Array(outLen);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = lookup[clean.charCodeAt(i)];
    const b = lookup[clean.charCodeAt(i + 1)];
    const c = lookup[clean.charCodeAt(i + 2)];
    const d = lookup[clean.charCodeAt(i + 3)];
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (p < outLen) out[p++] = (n >> 16) & 0xff;
    if (p < outLen) out[p++] = (n >> 8) & 0xff;
    if (p < outLen) out[p++] = n & 0xff;
  }
  return out;
}

/**
 * Hitung embedding wajah dari file foto (uri). number[] bila berhasil; null bila
 * model belum siap / gagal proses. Mengandalkan user menaruh wajah di tengah
 * bingkai (tak ada deteksi wajah).
 */
export async function computeFaceEmbedding(uri: string): Promise<number[] | null> {
  try {
    const model = await getModel();
    const size = inputSize(model);

    // 1) Normalisasi orientasi + ambil dimensi asli.
    const base = await manipulateAsync(uri, []);
    const side = Math.floor(Math.min(base.width, base.height) * CENTER_CROP_RATIO);
    if (side < 1) return null;
    const originX = Math.floor((base.width - side) / 2);
    const originY = Math.floor((base.height - side) / 2);

    // 2) Crop kotak tengah + resize ke input model → JPEG base64.
    const out = await manipulateAsync(
      base.uri,
      [{ crop: { originX, originY, width: side, height: side } }, { resize: { width: size, height: size } }],
      { compress: 1, format: SaveFormat.JPEG, base64: true },
    );
    if (!out.base64) return null;

    // 3) Decode piksel RGBA.
    const raw = decodeJpeg(base64ToBytes(out.base64), { useTArray: true, formatAsRGBA: true });
    if (raw.width !== size || raw.height !== size) return null;

    // 4) Ambil RGB (buang alpha) → tensor NHWC float32, lalu normalisasi per mode.
    const n = size * size * 3;
    const input = new Float32Array(n);
    const px = raw.data; // RGBA
    for (let i = 0, j = 0; i < px.length; i += 4) {
      input[j++] = px[i];
      input[j++] = px[i + 1];
      input[j++] = px[i + 2];
    }
    if (FACE_MODEL_PREPROCESS === "facenet") {
      // Prewhiten per-gambar (FaceNet): (x - mean) / max(std, 1/sqrt(N)).
      let mean = 0;
      for (let k = 0; k < n; k++) mean += input[k];
      mean /= n;
      let varSum = 0;
      for (let k = 0; k < n; k++) {
        const d = input[k] - mean;
        varSum += d * d;
      }
      const stdAdj = Math.max(Math.sqrt(varSum / n), 1 / Math.sqrt(n));
      for (let k = 0; k < n; k++) input[k] = (input[k] - mean) / stdAdj;
    } else {
      // MobileFaceNet: skala tetap (x - 127.5) / 128.
      for (let k = 0; k < n; k++) input[k] = (input[k] - 127.5) / 128;
    }

    // 5) Inferensi → embedding.
    const result = await model.run([input.buffer as ArrayBuffer]);
    const vec = Array.from(new Float32Array(result[0]));
    if (vec.length === 0) return null;

    // 6) L2-normalize (stabilkan cosine).
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm === 0) return null;
    return vec.map((v) => v / norm);
  } catch (e) {
    console.warn("[face-embed] gagal menghitung embedding:", e);
    return null;
  }
}
