// Gambar remote dengan cache memori+disk (expo-image) — banner pengumuman dll
// tampil instan setelah dimuat sekali. Transisi halus + placeholder warna.
import { Image } from "expo-image";
import type { ImageStyle, StyleProp } from "react-native";

type ContentFit = "cover" | "contain" | "fill" | "none" | "scale-down";

export function CachedImage({
  uri,
  style,
  contentFit = "cover",
  onLoadEnd,
  onError,
}: {
  uri: string;
  style?: StyleProp<ImageStyle>;
  contentFit?: ContentFit;
  onLoadEnd?: () => void;
  onError?: () => void;
}) {
  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={150}
      onLoadEnd={onLoadEnd}
      onError={onError}
    />
  );
}
