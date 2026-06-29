// Kompres + resize gambar sebelum upload (hemat kuota, upload lebih cepat).
// Lazy-import expo-image-manipulator agar tak crash di build lama tanpa modul
// native; bila gagal/absen → kembalikan uri asli (tetap bisa upload).
export async function compressImage(
  uri: string,
  opts: { width?: number; maxWidth?: number; quality?: number } = {},
): Promise<string> {
  const maxWidth = opts.maxWidth ?? 1600;
  const quality = opts.quality ?? 0.6;
  try {
    const Manip = await import("expo-image-manipulator");
    // Hanya perkecil bila lebih lebar dari maxWidth (hindari upscale); selalu
    // re-encode JPEG dgn quality utk menyusutkan ukuran.
    const actions = opts.width && opts.width > maxWidth ? [{ resize: { width: maxWidth } }] : [];
    const result = await Manip.manipulateAsync(uri, actions, {
      compress: quality,
      format: Manip.SaveFormat.JPEG,
    });
    return result.uri || uri;
  } catch {
    return uri;
  }
}
