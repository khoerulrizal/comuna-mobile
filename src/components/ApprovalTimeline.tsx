// Linimasa approval berjenjang — dipakai di Detail Masalah & Detail Kehadiran.
import { View } from "react-native";
import { Icon, type IconName, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";
import type { IssueApproval } from "@/lib/attendance-issues";

export function ApprovalTimeline({ items }: { items: IssueApproval[] }) {
  return (
    <View>
      {items.map((a, i) => (
        <ApprovalRow key={i} a={a} last={i === items.length - 1} />
      ))}
    </View>
  );
}

function ApprovalRow({ a, last }: { a: IssueApproval; last: boolean }) {
  const meta: { icon: IconName; color: string } =
    a.decision === "APPROVED" ? { icon: "check", color: colors.mint[700] }
    : a.decision === "REJECTED" ? { icon: "close", color: colors.coral[700] }
    : a.isCurrent ? { icon: "clock", color: colors.amber[700] }
    : { icon: "clock", color: colors.neutral[400] };
  const active = a.decision !== "PENDING" || a.isCurrent;
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", paddingBottom: last ? 0 : 16 }}>
      <View style={{ alignItems: "center", paddingTop: 2 }}>
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: active ? meta.color : `${meta.color}22`, borderWidth: active ? 0 : 1.5, borderColor: `${meta.color}66`, alignItems: "center", justifyContent: "center" }}>
          <Icon name={meta.icon} size={13} color={active ? "#fff" : meta.color} strokeWidth={2.4} />
        </View>
        {!last ? <View style={{ width: 1.5, flex: 1, minHeight: 22, backgroundColor: colors.neutral[100], marginTop: 2 }} /> : null}
      </View>
      <View style={{ flex: 1, paddingTop: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Txt size={11} weight="bold" color={colors.neutral[400]} style={{ letterSpacing: 0.3 }}>LANGKAH {a.stepOrder}</Txt>
          {a.decidedLabel ? <Txt size={10.5} color={colors.neutral[400]}>{a.decidedLabel}</Txt> : a.isCurrent ? <Txt size={10.5} weight="bold" color={colors.amber[700]}>Menunggu</Txt> : null}
        </View>
        <Txt size={13.5} weight="bold" color={colors.neutral[900]} style={{ marginTop: 1 }}>{a.approverName}</Txt>
        <Txt size={11.5} weight="semibold" color={meta.color} style={{ marginTop: 1 }}>
          {a.decision === "APPROVED" ? "Menyetujui" : a.decision === "REJECTED" ? "Menolak" : a.isCurrent ? "Sedang ditinjau" : "Menunggu giliran"}
        </Txt>
        {a.note ? <Txt size={12} color={colors.neutral[600]} style={{ marginTop: 4, lineHeight: 17 }}>{a.note}</Txt> : null}
      </View>
    </View>
  );
}
