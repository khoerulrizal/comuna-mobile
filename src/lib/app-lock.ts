// State kunci aplikasi (PIN/biometrik) di MEMORI — sengaja reset tiap cold start
// (modul di-inisialisasi ulang). Ini sumber kebenaran TUNGGAL untuk "apakah sesi
// sudah dibuka kunci", independen dari navigasi. Karena gerbang kunci dirender
// sebagai OVERLAY (lihat components/LockGate), deep link / cold start ke route
// mana pun tetap tertutup — tak bisa di-bypass seperti pendekatan berbasis route.
//
// Alur:
//   - cold start  → `unlocked=false` → overlay tampil (bila sesi+PIN ada)
//   - sukses PIN/biometrik / login / buat PIN → markUnlocked()
//   - app ke background → lock() → foreground berikutnya minta buka kunci lagi

type Listener = () => void;

let unlocked = false;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l();
}

/** Apakah sesi sudah dibuka kunci pada siklus hidup app ini. */
export function isUnlocked(): boolean {
  return unlocked;
}

/** Tandai terbuka (setelah PIN/biometrik sukses, login, atau buat PIN). */
export function markUnlocked(): void {
  if (unlocked) return;
  unlocked = true;
  emit();
}

/** Kunci kembali (mis. saat app masuk background). */
export function lock(): void {
  if (!unlocked) return;
  unlocked = false;
  emit();
}

/** Langganan perubahan status kunci. Mengembalikan fungsi unsubscribe. */
export function subscribeLock(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
