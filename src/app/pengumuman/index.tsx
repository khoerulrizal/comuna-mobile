// Pengumuman — daftar (banner + kategori + pin + perlu konfirmasi). Ikut desain Corelia.
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Icon, Txt } from "@/components/ui";
import { CachedImage } from "@/components/CachedImage";
import { colors } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  announcementShortDate, categoryTint, getAnnouncements, type AnnouncementListItem,
} from "@/lib/announcements";

export default function PengumumanScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AnnouncementListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setError(null); setItems((await getAnnouncements()).announcements); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat pengumuman"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <View style={{ alignItems: "center" }}>
          <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Pengumuman</Txt>
          {items ? <Txt size={11} weight="semibold" color={colors.neutral[400]}>{items.length} pengumuman</Txt> : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading && !items ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : !items || items.length === 0 ? (
            <Card pad={24} radius={18}>
              <View style={{ alignItems: "center", gap: 8 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                  <Icon name="bell" size={22} color={colors.brand[500]} strokeWidth={2} />
                </View>
                <Txt size={13.5} weight="bold" color={colors.neutral[800]}>Belum ada pengumuman</Txt>
                <Txt size={12} color={colors.neutral[500]} style={{ textAlign: "center" }}>Pengumuman dari perusahaan akan tampil di sini.</Txt>
              </View>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {items.map((a) => <AnnouncementRow key={a.id} a={a} onPress={() => router.push(`/pengumuman/${a.id}`)} />)}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function AnnouncementRow({ a, onPress }: { a: AnnouncementListItem; onPress: () => void }) {
  const tint = categoryTint(a.category);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card pad={0} radius={18} style={{ overflow: "hidden" }}>
        {a.bannerUrl ? (
          <CachedImage uri={a.bannerUrl} style={{ width: "100%", height: 130, backgroundColor: colors.neutral[100] }} />
        ) : null}
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 }}>
              <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: tint.bg }}>
                <Txt size={9.5} weight="extrabold" color={tint.fg} style={{ letterSpacing: 0.4 }}>{tint.label.toUpperCase()}</Txt>
              </View>
              {a.isPinned ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.amber[100] }}>
                  <Icon name="star" size={10} color={colors.amber[700]} strokeWidth={2.4} fill={colors.amber[700]} />
                  <Txt size={9.5} weight="extrabold" color={colors.amber[700]}>PIN</Txt>
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Txt size={10.5} weight="semibold" color={colors.neutral[400]}>{announcementShortDate(a.publishedAt)}</Txt>
              <Icon name="chevronRight" size={13} color={colors.neutral[400]} strokeWidth={2.2} />
            </View>
          </View>

          <Txt size={14.5} weight="extrabold" color={colors.neutral[900]} style={{ lineHeight: 19 }} numberOfLines={2}>{a.title}</Txt>
          {a.excerpt ? <Txt size={12} color={colors.neutral[500]} style={{ marginTop: 4, lineHeight: 18 }} numberOfLines={2}>{a.excerpt}</Txt> : null}

          {(a.attachmentCount > 0 || a.requireConfirmation) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 }}>
              {a.attachmentCount > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Icon name="link" size={12} color={colors.neutral[400]} strokeWidth={2.2} />
                  <Txt size={11} weight="semibold" color={colors.neutral[500]}>{a.attachmentCount} lampiran</Txt>
                </View>
              ) : null}
              {a.requireConfirmation ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Icon name={a.confirmed ? "check" : "info"} size={12} color={a.confirmed ? colors.mint[700] : colors.amber[700]} strokeWidth={2.4} />
                  <Txt size={11} weight="semibold" color={a.confirmed ? colors.mint[700] : colors.amber[700]}>{a.confirmed ? "Sudah dikonfirmasi" : "Perlu konfirmasi"}</Txt>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
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
