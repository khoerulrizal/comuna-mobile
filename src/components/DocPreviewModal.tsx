// Pratinjau lampiran di dalam aplikasi (modal) — gambar (zoom) atau dokumen
// (PDF/Office) via WebView. Berkas tersimpan di CDN publik, jadi bisa dipratinjau.
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Dimensions, Image, Linking, Modal, Platform, Pressable, ScrollView, View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";

export interface PreviewDoc {
  url: string;
  name?: string | null;
  mimeType?: string | null;
}

/** Apakah lampiran berupa gambar (dari mime atau ekstensi URL). */
export function isImageDoc(url: string, mime?: string | null): boolean {
  if (mime) return mime.startsWith("image/");
  return /\.(png|jpe?g|gif|webp|bmp|heic|heif)(\?|$)/i.test(url);
}
function isPdf(url: string, mime?: string | null): boolean {
  if (mime) return mime === "application/pdf";
  return /\.pdf(\?|$)/i.test(url);
}
/** URL untuk WebView: PDF di iOS bisa langsung; Android & dokumen Office lewat Google Docs Viewer. */
function viewerUri(url: string, mime?: string | null): string {
  if (isPdf(url, mime) && Platform.OS === "ios") return url;
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
}

const { width: SCR_W, height: SCR_H } = Dimensions.get("window");

export function DocPreviewModal({ doc, onClose }: { doc: PreviewDoc | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const visible = doc != null;
  const isImg = doc ? isImageDoc(doc.url, doc.mimeType) : false;

  // Reset state tiap dokumen baru dibuka.
  useEffect(() => {
    if (doc) { setLoading(true); setFailed(false); }
  }, [doc]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)", paddingTop: insets.top }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, height: 52, gap: 8 }}>
          <Pressable onPress={onClose} hitSlop={10} style={iconBtn}>
            <Icon name="close" size={20} color="#fff" strokeWidth={2.2} />
          </Pressable>
          <Txt size={13} weight="bold" color="#fff" numberOfLines={1} style={{ flex: 1, textAlign: "center" }}>
            {doc?.name || "Lampiran"}
          </Txt>
          <Pressable onPress={() => doc && Linking.openURL(doc.url)} hitSlop={10} style={iconBtn}>
            <Icon name="download" size={18} color="#fff" strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Body */}
        <View style={{ flex: 1 }}>
          {doc && isImg ? (
            <ScrollView
              maximumZoomScale={5}
              minimumZoomScale={1}
              centerContent
              contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center" }}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <Image
                source={{ uri: doc.url }}
                style={{ width: SCR_W, height: SCR_H * 0.8 }}
                resizeMode="contain"
                onLoadEnd={() => setLoading(false)}
                onError={() => { setLoading(false); setFailed(true); }}
              />
            </ScrollView>
          ) : doc ? (
            <WebView
              source={{ uri: viewerUri(doc.url, doc.mimeType) }}
              style={{ flex: 1, backgroundColor: "transparent" }}
              originWhitelist={["*"]}
              onLoadEnd={() => setLoading(false)}
              onError={() => { setLoading(false); setFailed(true); }}
              javaScriptEnabled
              domStorageEnabled
            />
          ) : null}

          {loading && !failed ? (
            <View style={overlay} pointerEvents="none">
              <ActivityIndicator color="#fff" size="large" />
              <Txt size={12} color="rgba(255,255,255,0.7)" style={{ marginTop: 10 }}>Memuat dokumen…</Txt>
            </View>
          ) : null}

          {failed ? (
            <View style={overlay}>
              <Icon name="doc" size={36} color="rgba(255,255,255,0.6)" />
              <Txt size={13} weight="semibold" color="#fff" style={{ marginTop: 12 }}>Tidak bisa menampilkan di sini</Txt>
              <Pressable onPress={() => doc && Linking.openURL(doc.url)} style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)" }}>
                <Txt size={12.5} weight="bold" color="#fff">Buka di browser →</Txt>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Hint fallback untuk dokumen non-gambar */}
        {doc && !isImg && !failed ? (
          <Pressable onPress={() => Linking.openURL(doc.url)} style={{ alignItems: "center", paddingVertical: 10, paddingBottom: insets.bottom + 10 }}>
            <Txt size={12} weight="semibold" color="rgba(255,255,255,0.75)">Tidak tampil? Buka di browser →</Txt>
          </Pressable>
        ) : (
          <View style={{ paddingBottom: insets.bottom }} />
        )}
      </View>
    </Modal>
  );
}

const iconBtn = {
  width: 38, height: 38, borderRadius: 19, alignItems: "center" as const, justifyContent: "center" as const,
  backgroundColor: "rgba(255,255,255,0.12)",
};
const overlay = {
  position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0,
  alignItems: "center" as const, justifyContent: "center" as const,
};
