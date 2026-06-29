// Jenis Cuti & Kuota — daftar kebijakan cuti yang berlaku utk karyawan + detail,
// kuota, & pemakaian per periode. Read-only.
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Icon, type IconName, Txt } from "@/components/ui";
import { colors, fonts } from "@/theme/tokens";
import { AuthError } from "@/lib/api";
import {
  getLeavePolicies, leaveCategoryLabel, leaveCategoryVisual,
  type LeavePolicyDetail,
} from "@/lib/leave";

function nf(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

export default function KebijakanCutiScreen() {
  const insets = useSafeAreaInsets();
  const [policies, setPolicies] = useState<LeavePolicyDetail[] | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setError(null); const res = await getLeavePolicies(); setPolicies(res.policies); setYear(res.year); }
    catch (e) { if (e instanceof AuthError) { router.replace("/login"); return; } setError(e instanceof Error ? e.message : "Gagal memuat kebijakan cuti"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useFocusEffect(useCallback(() => { let a = true; (async () => { if (a) await load(); })(); return () => { a = false; }; }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral[25], paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View style={headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={boxBtn}><Icon name="chevronLeft" size={18} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
        <View style={{ alignItems: "center" }}>
          <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Jenis Cuti & Kuota</Txt>
          {year ? <Txt size={11} weight="semibold" color={colors.neutral[400]}>Tahun {year}</Txt> : null}
        </View>
        <View style={{ width: 38 }} />
      </View>

      {loading && !policies ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.brand[500]} /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand[500]} colors={[colors.brand[500]]} />}
        >
          {error ? (
            <Card pad={16}><Txt size={13} color={colors.rose[700]} style={{ textAlign: "center" }}>{error}</Txt></Card>
          ) : !policies || policies.length === 0 ? (
            <Card pad={24} radius={18}>
              <View style={{ alignItems: "center", gap: 8 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand[100], alignItems: "center", justifyContent: "center" }}>
                  <Icon name="plane" size={22} color={colors.brand[500]} strokeWidth={2} />
                </View>
                <Txt size={13.5} weight="bold" color={colors.neutral[800]}>Belum ada kebijakan</Txt>
                <Txt size={12} color={colors.neutral[500]} style={{ textAlign: "center" }}>Belum ada jenis cuti yang berlaku untukmu saat ini.</Txt>
              </View>
            </Card>
          ) : (
            <>
              <Txt size={12.5} color={colors.neutral[500]} style={{ marginBottom: 12, lineHeight: 18 }}>
                {policies.length} jenis cuti berlaku untukmu. Kuota & pemakaian dihitung untuk periode berjalan.
              </Txt>
              <View style={{ gap: 12 }}>
                {policies.map((p) => <PolicyCard key={p.id} p={p} />)}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function maxPerRequestLabel(p: LeavePolicyDetail): string {
  if (p.maxRequestDays != null) return `Maks ${nf(p.maxRequestDays)} hari/pengajuan`;
  if (!p.isUnlimited) return `Maks ${nf(p.defaultDays)} hari/pengajuan`;
  return "Tanpa batas/pengajuan";
}

function PolicyCard({ p }: { p: LeavePolicyDetail }) {
  const vis = leaveCategoryVisual(p.category);
  const pct = p.quota && p.quota > 0 ? Math.min(100, (p.used / p.quota) * 100) : 0;
  const barColor = pct >= 100 ? colors.coral[500] : pct >= 75 ? colors.amber[500] : colors.brand[500];

  return (
    <Card pad={16} radius={18}>
      {/* Header */}
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: vis.bg, alignItems: "center", justifyContent: "center" }}>
          <Icon name={vis.icon as IconName} size={20} color={vis.color} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={14.5} weight="extrabold" color={colors.neutral[900]} numberOfLines={1}>{p.name}</Txt>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.neutral[100] }}>
              <Txt size={9.5} weight="bold" color={colors.neutral[600]}>{leaveCategoryLabel(p.category)}</Txt>
            </View>
            <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, backgroundColor: colors.brand[100] }}>
              <Txt size={9.5} weight="bold" color={colors.brand[700]}>{maxPerRequestLabel(p)}</Txt>
            </View>
          </View>
        </View>
      </View>

      {/* Kuota & pemakaian */}
      <View style={{ marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: colors.neutral[25] }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <View>
            <Txt size={10.5} weight="bold" color={colors.neutral[500]} style={{ letterSpacing: 0.3 }}>KUOTA {p.quotaPeriodLabel.toUpperCase()}</Txt>
            {p.isUnlimited || p.quota == null ? (
              <Txt size={18} weight="extrabold" color={colors.neutral[900]} style={{ marginTop: 2, fontFamily: fonts.extrabold }}>Tanpa batas</Txt>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                <Txt size={20} weight="extrabold" color={colors.neutral[900]} style={{ fontFamily: fonts.extrabold }}>{nf(p.remaining ?? 0)}</Txt>
                <Txt size={12} weight="semibold" color={colors.neutral[400]}>/ {nf(p.quota)} hari tersisa</Txt>
              </View>
            )}
          </View>
          <Txt size={10.5} weight="semibold" color={colors.neutral[400]}>{p.periodLabel}</Txt>
        </View>

        {!p.isUnlimited && p.quota != null ? (
          <>
            <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.neutral[100], overflow: "hidden", marginTop: 10 }}>
              <View style={{ width: `${pct}%`, height: "100%", borderRadius: 4, backgroundColor: barColor }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
              <Txt size={11} weight="semibold" color={colors.neutral[600]}>{nf(p.used)} terpakai</Txt>
              {p.pending > 0 ? <Txt size={11} weight="semibold" color={colors.amber[700]}>{nf(p.pending)} menunggu</Txt> : null}
            </View>
          </>
        ) : p.pending > 0 ? (
          <Txt size={11} weight="semibold" color={colors.amber[700]} style={{ marginTop: 8 }}>{nf(p.used)} terpakai · {nf(p.pending)} menunggu periode ini</Txt>
        ) : (
          <Txt size={11} weight="semibold" color={colors.neutral[600]} style={{ marginTop: 8 }}>{nf(p.used)} terpakai periode ini</Txt>
        )}
      </View>

      {/* Deskripsi */}
      {p.description ? <Txt size={12.5} color={colors.neutral[600]} style={{ marginTop: 12, lineHeight: 19 }}>{p.description}</Txt> : null}

      {/* Detail kebijakan (chips) */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <InfoChip icon={p.isPaid ? "money" : "info"} text={p.isPaid ? "Berbayar" : "Tanpa upah"} />
        {p.minWorkingMonths > 0 ? <InfoChip icon="briefcase" text={`Min ${p.minWorkingMonths} bln kerja`} /> : null}
        {p.minRequestDaysAhead > 0 ? <InfoChip icon="clock" text={`Ajukan H-${p.minRequestDaysAhead}`} /> : null}
        {p.allowHalfDay ? <InfoChip icon="clock" text={p.halfDayHours ? `Paruh hari (${nf(p.halfDayHours)} jam)` : "Boleh paruh hari"} /> : null}
        {p.attachmentRequired ? <InfoChip icon="doc" text="Wajib lampiran" /> : null}
        {p.allowLeaveDebt ? <InfoChip icon="info" text="Boleh hutang cuti" /> : null}
        {p.category === "ANNUAL" && p.carryForwardType !== "NONE" ? (
          <InfoChip icon="arrowRight" text={p.carryForwardMaxDays != null ? `Carry-forward maks ${p.carryForwardMaxDays} hari` : "Bisa carry-forward"} />
        ) : null}
        {p.autoApproveAfterDays != null ? <InfoChip icon="check" text={`Auto-setuju ${p.autoApproveAfterDays} hari`} /> : null}
      </View>

      {/* Dasar hukum */}
      {p.legalBasis ? (
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
          <Icon name="shield" size={13} color={colors.neutral[400]} strokeWidth={2} />
          <Txt size={11} color={colors.neutral[500]} style={{ flex: 1, lineHeight: 16 }}>{p.legalBasis}</Txt>
        </View>
      ) : null}
    </Card>
  );
}

function InfoChip({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.neutral[50] }}>
      <Icon name={icon} size={11} color={colors.neutral[500]} strokeWidth={2.2} />
      <Txt size={11} weight="semibold" color={colors.neutral[600]}>{text}</Txt>
    </View>
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
