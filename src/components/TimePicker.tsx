// Pemilih waktu (HH:mm) — dua kolom jam & menit, pure-JS tanpa dependency native.
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Icon, Txt } from "@/components/ui";
import { colors, radii } from "@/theme/tokens";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // step 5 menit

function pad(n: number) { return String(n).padStart(2, "0"); }

export function TimePicker({
  visible, value, title = "Pilih waktu", onSelect, onClose,
}: {
  visible: boolean;
  value: string | null;
  title?: string;
  onSelect: (time: string) => void;
  onClose: () => void;
}) {
  const init = value && /^\d{2}:\d{2}$/.test(value) ? value.split(":").map(Number) : [18, 0];
  const [h, setH] = useState(init[0]);
  const [m, setM] = useState(init[1] - (init[1] % 5));

  function confirm() { onSelect(`${pad(h)}:${pad(m)}`); onClose(); }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(20,16,45,0.45)", justifyContent: "center", padding: 24 }}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: "#fff", borderRadius: radii.xl, padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Txt size={14} weight="bold" color={colors.neutral[800]}>{title}</Txt>
            <Pressable onPress={onClose} hitSlop={8}><Icon name="close" size={20} color={colors.neutral[500]} /></Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 10, height: 200 }}>
            <Column label="Jam" data={HOURS} selected={h} onPick={setH} />
            <Column label="Menit" data={MINUTES} selected={m} onPick={setM} />
          </View>

          <Pressable onPress={confirm} style={{ marginTop: 12, backgroundColor: colors.brand[500], borderRadius: radii.md, paddingVertical: 12, alignItems: "center" }}>
            <Txt size={14} weight="extrabold" color="#fff">Pilih {pad(h)}:{pad(m)}</Txt>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Column({ label, data, selected, onPick }: { label: string; data: number[]; selected: number; onPick: (n: number) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Txt size={10.5} weight="bold" color={colors.neutral[400]} style={{ textAlign: "center", marginBottom: 6 }}>{label.toUpperCase()}</Txt>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
        {data.map((n) => {
          const on = n === selected;
          return (
            <Pressable key={n} onPress={() => onPick(n)} style={{ paddingVertical: 9, borderRadius: radii.md, alignItems: "center", backgroundColor: on ? colors.brand[500] : "transparent" }}>
              <Txt size={15} weight={on ? "bold" : "medium"} color={on ? "#fff" : colors.neutral[700]}>{pad(n)}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
