// Route /unlock — kini tipis. Gerbang kunci UTAMA adalah overlay global (LockGate
// di root layout); route ini dipertahankan untuk kompatibilitas / navigasi manual.
import { router } from "expo-router";
import { LockScreen } from "@/components/LockScreen";

export default function UnlockScreen() {
  return <LockScreen onUnlocked={() => router.replace("/home")} />;
}
