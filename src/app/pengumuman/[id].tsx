// Detail Pengumuman — banner + konten kaya (HTML) + lampiran (preview) + konfirmasi.
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Card, Icon, type IconName, Txt } from "@/components/ui";
import { RichTextView } from "@/components/RichTextView";
import { CachedImage } from "@/components/CachedImage";
import { DocPreviewModal, isImageDoc, type PreviewDoc } from "@/components/DocPreviewModal";
import { colors, fonts } from "@/theme/tokens";
import { AuthError, ApiError } from "@/lib/api";
import {
  announcementFullDate, categoryTint, confirmAnnouncement, fileSizeLabel, getAnnouncement,
  type AnnouncementAttachment, type AnnouncementDetail,
} from "@/lib/announcements";

export default function PengumumanDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try { setError(null); setData(await getAnnouncement(id)); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat pengumuman"); }
    finally { setLoading(false); setRefreshing(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  async function onConfirm() {
    if (!data || confirming) return;
    setConfirming(true);
    try {
      const res = await confirmAnnouncement(data.id);
      setData({ ...data, confirmed: true, confirmedAt: res.confirmedAt });
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof ApiError ? e.message : "Gagal menyimpan konfirmasi");
    } finally {
      setConfirming(false);
    }
  }

  const tint = data ? categoryTint(data.category) : null;
  const showConfirmBar = data?.requireConfirmation;

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={14} weight="extrabold" color={colors.neutral[900]}>Detail Pengumuman</Txt>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : error || !data || !tint ? (
        <View style={{ padding: 16 }}><Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error ?? "Tidak ditemukan"}</Txt></Card></View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingBottom: (showConfirmBar ? 88 : 16) + insets.bottom }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
          >
            {/* Banner */}
            {data.bannerUrl ? (
              <CachedImage uri={data.bannerUrl} style={{ width: "100%", height: 190, backgroundColor: colors.neutral[100] }} />
            ) : null}

            <View style={{ padding: 16 }}>
              {/* Kategori + pin */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 11, paddingVertical: 4, borderRadius: 999, backgroundColor: tint.bg }}>
                  <Txt size={10} weight="extrabold" color={tint.fg} style={{ letterSpacing: 0.5 }}>{tint.label.toUpperCase()}</Txt>
                </View>
                {data.isPinned ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.amber[100] }}>
                    <Icon name="star" size={11} color={colors.amber[700]} strokeWidth={2.4} fill={colors.amber[700]} />
                    <Txt size={10} weight="extrabold" color={colors.amber[700]}>Disematkan</Txt>
                  </View>
                ) : null}
              </View>

              {/* Judul */}
              <Txt size={22} weight="extrabold" color={colors.neutral[900]} style={{ lineHeight: 28, fontFamily: fonts.extrabold }}>{data.title}</Txt>

              {/* Penulis + tanggal */}
              <Card pad={12} radius={14} style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 }}>
                <Avatar name={data.createdByName} size={36} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={12.5} weight="extrabold" color={colors.neutral[900]} numberOfLines={1}>{data.createdByName}</Txt>
                  <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>Diposting {announcementFullDate(data.publishedAt)}</Txt>
                </View>
              </Card>

              {/* Konten kaya */}
              <View style={{ marginTop: 16 }}>
                <RichTextView content={data.content} />
              </View>

              {/* Lampiran */}
              {data.attachments.length > 0 ? (
                <View style={{ marginTop: 18 }}>
                  <Txt size={12.5} weight="extrabold" color={colors.neutral[700]} style={{ marginBottom: 8 }}>Lampiran ({data.attachments.length})</Txt>
                  <View style={{ gap: 8 }}>
                    {data.attachments.map((att) => (
                      <AttachmentRow key={att.id} att={att} onPress={() => setPreview({ url: att.url, name: att.name, mimeType: att.mimeType })} />
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Status konfirmasi (info) */}
              {data.requireConfirmation && data.confirmed ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: colors.mint[100] }}>
                  <Icon name="check" size={15} color={colors.mint[700]} strokeWidth={2.6} />
                  <Txt size={12} weight="semibold" color={colors.mint[700]} style={{ flex: 1 }}>
                    Kamu sudah mengonfirmasi membaca pengumuman ini{data.confirmedAt ? ` · ${announcementFullDate(data.confirmedAt)}` : ""}.
                  </Txt>
                </View>
              ) : null}
            </View>
          </ScrollView>

          {/* Footer konfirmasi */}
          {showConfirmBar ? (
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.neutral[100], paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12 }}>
              {data.confirmed ? (
                <View style={{ height: 50, borderRadius: 14, backgroundColor: colors.mint[100], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Icon name="check" size={18} color={colors.mint[700]} strokeWidth={2.6} />
                  <Txt size={14.5} weight="extrabold" color={colors.mint[700]}>Sudah Dikonfirmasi</Txt>
                </View>
              ) : (
                <Pressable onPress={onConfirm} disabled={confirming} style={{ height: 50, borderRadius: 14, backgroundColor: colors.brand[500], flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: confirming ? 0.6 : 1 }}>
                  <Icon name="check" size={18} color="#fff" strokeWidth={2.6} />
                  <Txt size={14.5} weight="extrabold" color="#fff">{confirming ? "Menyimpan..." : "Konfirmasi Sudah Membaca"}</Txt>
                </Pressable>
              )}
            </View>
          ) : null}
        </>
      )}

      <DocPreviewModal doc={preview} onClose={() => setPreview(null)} />
    </View>
  );
}

function AttachmentRow({ att, onPress }: { att: AnnouncementAttachment; onPress: () => void }) {
  const isImg = isImageDoc(att.url, att.mimeType);
  const icon: IconName = isImg ? "camera" : "doc";
  const size = fileSizeLabel(att.sizeBytes);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <Card pad={12} radius={14} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={18} color={colors.brand[600]} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={13} weight="bold" color={colors.neutral[900]} numberOfLines={1}>{att.name}</Txt>
          <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>{size ? `${size} · ` : ""}Ketuk untuk pratinjau</Txt>
        </View>
        <Icon name="eye" size={16} color={colors.neutral[400]} strokeWidth={2.2} />
      </Card>
    </Pressable>
  );
}

const headerBar = {
  flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const,
  paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff",
  borderBottomWidth: 1, borderBottomColor: colors.neutral[100],
};
const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
