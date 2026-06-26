// Pemilih tanggal — kalender bulanan pure-JS (tanpa dependency native).
import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Icon, Txt } from "@/components/ui";
import { colors, radii } from "@/theme/tokens";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function atMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function DatePicker({
  visible,
  value,
  min,
  max,
  title = "Pilih tanggal",
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: Date | null;
  min?: Date;
  max?: Date;
  title?: string;
  onSelect: (d: Date) => void;
  onClose: () => void;
}) {
  const initial = value ?? new Date();
  const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() });

  const minT = min ? atMidnight(min).getTime() : -Infinity;
  const maxT = max ? atMidnight(max).getTime() : Infinity;

  const first = new Date(view.y, view.m, 1);
  const lead = first.getDay(); // 0=Min
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.y, view.m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const prev = () => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const next = () => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));
  const selKey = value ? ymd(atMidnight(value)) : null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(20,16,45,0.45)", justifyContent: "center", padding: 24 }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{ backgroundColor: "#fff", borderRadius: radii.xl, padding: 16 }}
        >
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Txt size={14} weight="bold" color={colors.neutral[800]}>{title}</Txt>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={20} color={colors.neutral[500]} />
            </Pressable>
          </View>

          {/* Bulan nav */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Pressable onPress={prev} hitSlop={8} style={{ padding: 6 }}>
              <Icon name="chevronLeft" size={20} color={colors.neutral[700]} />
            </Pressable>
            <Txt size={14} weight="bold" color={colors.neutral[800]}>
              {MONTHS[view.m]} {view.y}
            </Txt>
            <Pressable onPress={next} hitSlop={8} style={{ padding: 6 }}>
              <Icon name="chevronRight" size={20} color={colors.neutral[700]} />
            </Pressable>
          </View>

          {/* Hari */}
          <View style={{ flexDirection: "row" }}>
            {DOW.map((d, i) => (
              <View key={d} style={{ flex: 1, alignItems: "center", paddingVertical: 4 }}>
                <Txt size={10.5} weight="bold" color={i === 0 ? colors.rose[500] : colors.neutral[400]}>{d}</Txt>
              </View>
            ))}
          </View>

          {/* Grid tanggal */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {cells.map((d, idx) => {
              if (!d) return <View key={`b${idx}`} style={{ width: `${100 / 7}%`, height: 40 }} />;
              const t = d.getTime();
              const disabled = t < minT || t > maxT;
              const selected = selKey === ymd(d);
              return (
                <Pressable
                  key={ymd(d)}
                  disabled={disabled}
                  onPress={() => { onSelect(d); onClose(); }}
                  style={{ width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center" }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: selected ? colors.brand[500] : "transparent",
                    }}
                  >
                    <Txt
                      size={13.5}
                      weight={selected ? "bold" : "medium"}
                      color={
                        disabled
                          ? colors.neutral[300]
                          : selected
                            ? "#fff"
                            : colors.neutral[800]
                      }
                    >
                      {d.getDate()}
                    </Txt>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
