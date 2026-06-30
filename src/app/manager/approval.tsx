// Persetujuan (manager) — pending/riwayat + setujui/tolak. Ikut desain Corelia.
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Button, Card, Icon, Pill, Txt } from "@/components/ui";
import { colors, fonts, radii } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getApprovals, decideApproval, approvalTypeMeta, approvalDetail, timeAgo, decisionMeta,
  type ApprovalItem,
} from "@/lib/approval";

type Tab = "pending" | "history";

export default function ApprovalScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("pending");
  const [hasAccess, setHasAccess] = useState(true);
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ApprovalItem | null>(null);

  const load = useCallback(async (t: Tab) => {
    try {
      setError(null);
      const res = await getApprovals(t);
      setHasAccess(res.hasAccess);
      setItems(res.items);
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      setError(e instanceof Error ? e.message : "Gagal memuat persetujuan");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(tab); })(); return () => { a = false; }; }, [load, tab]));
  const onRefresh = useCallback(() => { setRefreshing(true); load(tab); }, [load, tab]);

  function switchTab(t: Tab) {
    if (t === tab) return;
    setTab(t); setLoading(true); load(t);
  }

  async function approve(it: ApprovalItem) {
    if (acting) return;
    setActing(it.requestId);
    try {
      await decideApproval(it.kind, it.requestId, "APPROVED");
      setItems((prev) => prev.filter((x) => x.requestId !== it.requestId));
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      Alert.alert("Gagal menyetujui", e instanceof Error ? e.message : "Coba lagi");
    } finally { setActing(null); }
  }

  async function confirmReject(note: string) {
    const it = rejectTarget;
    if (!it) return;
    setActing(it.requestId);
    setRejectTarget(null);
    try {
      await decideApproval(it.kind, it.requestId, "REJECTED", note.trim() || null);
      setItems((prev) => prev.filter((x) => x.requestId !== it.requestId));
    } catch (e) {
      if (e instanceof AuthError) { router.replace("/login"); return; }
      Alert.alert("Gagal menolak", e instanceof Error ? e.message : "Coba lagi");
    } finally { setActing(null); }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff" }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <Txt size={15} weight="extrabold" color={colors.neutral[900]} style={{ flex: 1, textAlign: "center" }}>Persetujuan</Txt>
        <View style={{ width: 38 }} />
      </View>

      {/* Tabs */}
      {hasAccess ? (
        <View style={{ flexDirection: "row", gap: 4, marginHorizontal: 16, marginBottom: 4, backgroundColor: colors.neutral[50], borderRadius: 12, padding: 4 }}>
          {([["pending", "Menunggu"], ["history", "Riwayat"]] as [Tab, string][]).map(([k, label]) => {
            const on = tab === k;
            return (
              <Pressable key={k} onPress={() => switchTab(k)} style={{ flex: 1, paddingVertical: 8, borderRadius: 9, backgroundColor: on ? "#fff" : "transparent", alignItems: "center" }}>
                <Txt size={12.5} weight={on ? "bold" : "semibold"} color={on ? colors.neutral[900] : colors.neutral[500]}>{label}</Txt>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : !hasAccess ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 }}>
          <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.amber[100], alignItems: "center", justifyContent: "center" }}>
            <Icon name="lock" size={32} color={colors.amber[700]} strokeWidth={1.8} />
          </View>
          <Txt size={16} weight="extrabold" color={colors.neutral[800]} style={{ textAlign: "center" }}>Belum punya akses approval</Txt>
          <Txt size={13} color={colors.neutral[500]} style={{ textAlign: "center", lineHeight: 19 }}>
            Anda belum terdaftar sebagai approver pada alur persetujuan. Hubungi HR Anda untuk pengaturan akses.
          </Txt>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : items.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 50, gap: 10 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: colors.mint[100], alignItems: "center", justifyContent: "center" }}>
                <Icon name="check" size={30} color={colors.mint[700]} strokeWidth={2} />
              </View>
              <Txt size={14} weight="bold" color={colors.neutral[700]}>{tab === "pending" ? "Tidak ada yang menunggu" : "Belum ada riwayat"}</Txt>
              <Txt size={12.5} color={colors.neutral[500]} style={{ textAlign: "center" }}>{tab === "pending" ? "Semua pengajuan tim sudah diproses." : "Keputusan persetujuan Anda akan muncul di sini."}</Txt>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {items.map((it) => (
                <ApprovalCard
                  key={`${it.kind}-${it.requestId}`}
                  it={it} tab={tab}
                  busy={acting === it.requestId}
                  onApprove={() => approve(it)}
                  onReject={() => setRejectTarget(it)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {rejectTarget ? (
        <RejectModal it={rejectTarget} onClose={() => setRejectTarget(null)} onConfirm={confirmReject} />
      ) : null}
    </View>
  );
}

function ApprovalCard({ it, tab, busy, onApprove, onReject }: { it: ApprovalItem; tab: Tab; busy: boolean; onApprove: () => void; onReject: () => void }) {
  const meta = approvalTypeMeta(it.kind);
  const detail = approvalDetail(it);
  const isHistory = tab === "history";
  const dm = decisionMeta(it.decision);
  return (
    <Card pad={14} radius={20}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {it.photoUrl ? <Image source={{ uri: it.photoUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} /> : <Avatar name={it.name} size={40} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={13.5} weight="extrabold" color={colors.neutral[900]}>{it.name}</Txt>
          <Txt size={11} color={colors.neutral[500]} style={{ marginTop: 1 }}>{isHistory ? timeAgo(it.decidedAt) : timeAgo(it.submittedAt)}</Txt>
        </View>
        <Pill tone={meta.tone}>
          <Icon name={meta.icon} size={11} color={meta.color} strokeWidth={2.2} />
          <Txt size={10.5} weight="bold" color={meta.color}>{meta.label}</Txt>
        </Pill>
      </View>

      <View style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: colors.neutral[25] }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Txt size={14} weight="extrabold" color={colors.neutral[900]}>{it.title}</Txt>
            <Txt size={12} color={colors.neutral[600]} style={{ marginTop: 3, lineHeight: 17 }} numberOfLines={3}>{it.reason}</Txt>
          </View>
          <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
            <Txt size={detail.highlight ? 15 : 12.5} weight="extrabold" color={detail.highlight ? colors.mint[700] : colors.neutral[800]}>{detail.primary}</Txt>
            {detail.secondary ? <Txt size={10.5} color={colors.neutral[500]} style={{ marginTop: 1 }}>{detail.secondary}</Txt> : null}
          </View>
        </View>
        {it.totalSteps > 1 ? (
          <Txt size={10.5} color={colors.neutral[400]} style={{ marginTop: 8, fontFamily: fonts.mono }}>Langkah {it.currentStep} dari {it.totalSteps}</Txt>
        ) : null}
      </View>

      {isHistory ? (
        <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pill tone={dm.tone}>{dm.label}</Pill>
          {it.note ? <Txt size={11.5} color={colors.neutral[500]} style={{ flex: 1 }} numberOfLines={1}>“{it.note}”</Txt> : null}
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label="Tolak" variant="outline" full disabled={busy} onPress={onReject} />
          </View>
          <View style={{ flex: 2 }}>
            <Button label={busy ? "Memproses…" : "Setujui"} variant="success" full disabled={busy} onPress={onApprove}
              left={!busy ? <Icon name="check" size={15} color="#fff" strokeWidth={3} /> : undefined} />
          </View>
        </View>
      )}
    </Card>
  );
}

function RejectModal({ it, onClose, onConfirm }: { it: ApprovalItem; onClose: () => void; onConfirm: (note: string) => void }) {
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState("");
  return (
    <Modal transparent visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(16,13,26,0.45)", justifyContent: "flex-end" }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ alignItems: "center", marginBottom: 14 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.neutral[200] }} />
          </View>
          <Txt size={16} weight="extrabold" color={colors.neutral[900]}>Tolak pengajuan</Txt>
          <Txt size={12.5} color={colors.neutral[500]} style={{ marginTop: 2 }}>{it.name} · {it.title}</Txt>

          <Txt size={11.5} weight="bold" color={colors.neutral[600]} style={{ marginTop: 18, marginBottom: 6 }}>ALASAN PENOLAKAN (OPSIONAL)</Txt>
          <TextInput
            value={note} onChangeText={setNote} multiline
            placeholder="Beri alasan agar karyawan paham"
            placeholderTextColor={colors.neutral[400]}
            style={{ backgroundColor: colors.neutral[50], borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 14, color: colors.neutral[900], height: 90, textAlignVertical: "top" }}
          />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <View style={{ flex: 1 }}><Button label="Batal" variant="outline" full onPress={onClose} /></View>
            <View style={{ flex: 1.4 }}><Button label="Tolak Pengajuan" variant="danger" full onPress={() => onConfirm(note)} /></View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const boxBtn = {
  width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[100],
  backgroundColor: "#fff", alignItems: "center" as const, justifyContent: "center" as const,
};
