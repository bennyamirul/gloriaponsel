/**
 * Audio Chime Synthesizer & Mobile Vibration Utility
 * Memutar nada dering notifikasi kasir / transaksi yang jernih dan renyah
 * menggunakan Web Audio API tanpa perlu aset file audio eksternal besar.
 */

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Memutar nada dering notifikasi "Bell / Cash Register Chime" yang merdu
 */
export function playNotificationRingtone(volume = 0.4) {
  if (typeof window === "undefined") return;

  // 1. Getarkan ponsel jika didukung browser HP
  try {
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate([200, 100, 250, 100, 350]);
    }
  } catch {
    // Abaikan pembatasan vibration
  }

  // 2. Putar nada melodi harmonik notifikasi
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    // Nada melodi lonceng 3 not bertingkat (E6 -> G#6 -> B6)
    const notes = [
      { freq: 1318.51, start: 0, duration: 0.2 },     // E6
      { freq: 1661.22, start: 0.12, duration: 0.25 }, // G#6
      { freq: 1975.53, start: 0.24, duration: 0.5 },  // B6
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(volume, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });
  } catch {
    // Abaikan pembatasan audio autoplay
  }
}

/**
 * Pancing inisialisasi audio saat pengguna pertama kali klik antarmuka
 * agar browser mobile tidak memblokir suara saat notifikasi masuk berikutnya.
 */
export function unlockAudioContext() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}
