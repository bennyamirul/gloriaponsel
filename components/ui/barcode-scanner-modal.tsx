"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  AlertCircle,
  Upload,
  ScanBarcode,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Keyboard,
  Smartphone,
  Zap,
  ZapOff,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BarcodeScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanSuccess: (barcodeValue: string) => void;
  title?: string;
  description?: string;
}

// SEMUA format barcode garis (1D) dan barcode kotak (2D) yang didukung
const ALL_SUPPORTED_FORMATS: Html5QrcodeSupportedFormats[] = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.AZTEC,
];

const NATIVE_BARCODE_FORMATS = [
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "itf",
  "qr_code",
  "data_matrix",
  "aztec",
];

// Bunyi bip konfirmasi pemindaian berhasil menggunakan Web Audio API
export function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {}

  // Getaran halus di smartphone (haptic feedback)
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(80);
    }
  } catch {}
}

// Helper: Optimasi resolusi & rotasi foto untuk akurasi maksimal deteksi barcode 1D dan 2D
async function optimizeImageForBarcode(file: File, rotateAngle = 0): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_DIM = 1600;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      if (rotateAngle === 90 || rotateAngle === 270) {
        canvas.width = height;
        canvas.height = width;
      } else {
        canvas.width = width;
        canvas.height = height;
      }

      if (rotateAngle !== 0) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotateAngle * Math.PI) / 180);
        ctx.drawImage(img, -width / 2, -height / 2, width, height);
      } else {
        ctx.drawImage(img, 0, 0, width, height);
      }

      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

// Fungsi scan barcode langsung dari File (Kamera HP Langsung / Galeri)
export async function scanBarcodeFromFile(file: File): Promise<string> {
  if (typeof window === "undefined" || !file) return "";

  // 1. Coba deteksi ultra-cepat dengan native BarcodeDetector browser (Chromium C++ GPU Engine)
  if ("BarcodeDetector" in window) {
    try {
      let formats = [...NATIVE_BARCODE_FORMATS];
      if (typeof (window as any).BarcodeDetector.getSupportedFormats === "function") {
        try {
          const supported = await (window as any).BarcodeDetector.getSupportedFormats();
          if (Array.isArray(supported) && supported.length > 0) {
            formats = formats.filter((f) => supported.includes(f));
          }
        } catch {}
      }

      const barcodeDetector = new (window as any).BarcodeDetector({ formats });

      // Pass 1A: deteksi langsung dari bitmap
      const bitmap = await createImageBitmap(file);
      let barcodes = await barcodeDetector.detect(bitmap);
      if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
        let val = barcodes[0].rawValue.trim();
        if (val.includes("/")) val = val.split("/")[0].trim();
        if (val) {
          playBeep();
          return val;
        }
      }

      // Pass 1B: Jika foto HP diambil vertikal tapi barcode di dus horizontal, coba putar 90 derajat
      const rotatedBlob = await optimizeImageForBarcode(file, 90);
      if (rotatedBlob) {
        const rotatedBitmap = await createImageBitmap(rotatedBlob);
        barcodes = await barcodeDetector.detect(rotatedBitmap);
        if (barcodes && barcodes.length > 0 && barcodes[0]?.rawValue) {
          let val = barcodes[0].rawValue.trim();
          if (val.includes("/")) val = val.split("/")[0].trim();
          if (val) {
            playBeep();
            return val;
          }
        }
      }
    } catch {
      // Lanjutkan ke mesin cadangan ZXing
    }
  }

  // 2. Mesin cadangan ZXing via Html5Qrcode dengan kontainer beresolusi tinggi
  let container = document.getElementById("html5-qrcode-scan-file-temp-global");
  if (!container) {
    container = document.createElement("div");
    container.id = "html5-qrcode-scan-file-temp-global";
    container.style.position = "fixed";
    container.style.top = "-9999px";
    container.style.left = "-9999px";
    container.style.width = "1200px";
    container.style.height = "1200px";
    container.style.opacity = "0";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
  }

  const fileScanner = new Html5Qrcode("html5-qrcode-scan-file-temp-global", {
    formatsToSupport: ALL_SUPPORTED_FORMATS,
    verbose: false,
    experimentalFeatures: {
      useBarCodeDetectorIfSupported: true,
    },
  });

  try {
    // Pass 2A: Coba file langsung
    try {
      const decodedText = await fileScanner.scanFile(file, false);
      let cleaned = (decodedText || "").trim();
      if (cleaned.includes("/")) cleaned = cleaned.split("/")[0].trim();
      if (cleaned) {
        playBeep();
        return cleaned;
      }
    } catch {}

    // Pass 2B: Coba gambar yang dioptimalkan skalanya
    const optimizedBlob = await optimizeImageForBarcode(file, 0);
    if (optimizedBlob) {
      const optimizedFile = new File([optimizedBlob], file.name, { type: "image/jpeg" });
      try {
        const decodedText = await fileScanner.scanFile(optimizedFile, false);
        let cleaned = (decodedText || "").trim();
        if (cleaned.includes("/")) cleaned = cleaned.split("/")[0].trim();
        if (cleaned) {
          playBeep();
          return cleaned;
        }
      } catch {}
    }

    // Pass 2C: Coba putar 90 derajat jika barcode vertikal pada foto tegak (portrait)
    const rotatedBlob = await optimizeImageForBarcode(file, 90);
    if (rotatedBlob) {
      const rotatedFile = new File([rotatedBlob], file.name, { type: "image/jpeg" });
      try {
        const decodedText = await fileScanner.scanFile(rotatedFile, false);
        let cleaned = (decodedText || "").trim();
        if (cleaned.includes("/")) cleaned = cleaned.split("/")[0].trim();
        if (cleaned) {
          playBeep();
          return cleaned;
        }
      } catch {}
    }
  } finally {
    try {
      fileScanner.clear();
    } catch {}
  }

  return "";
}

export function BarcodeScannerModal({
  open,
  onOpenChange,
  onScanSuccess,
  title = "Scan Barcode / IMEI / QR Code",
  description = "Arahkan kamera ke barcode garis (1D) atau barcode kotak (QR/2D).",
}: BarcodeScannerModalProps) {
  const [mode, setMode] = useState<"camera" | "upload" | "manual">("camera");
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isScanningFile, setIsScanningFile] = useState(false);
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    setSelectedCameraId("");
    setRetryCount((prev) => prev + 1);
  };

  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);
  const containerId = "html5-qrcode-modal-viewport";

  const isStoppingRef = useRef(false);
  const isStartingRef = useRef(false);
  const isDetectedRef = useRef(false);

  const onScanSuccessRef = useRef(onScanSuccess);
  onScanSuccessRef.current = onScanSuccess;
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  // Tangani unhandled rejection string dari html5-qrcode agar tidak crash di React / Next.js
  useEffect(() => {
    const handleRejection = (e: PromiseRejectionEvent) => {
      if (typeof e.reason === "string" && (e.reason.includes("transition") || e.reason.includes("stop"))) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  // Hentikan scanner dengan proteksi transisi aman
  const safeStopScanner = useCallback(async () => {
    if (isStoppingRef.current) return;
    const scanner = scannerInstanceRef.current;
    if (!scanner) return;

    try {
      isStoppingRef.current = true;
      setTorchOn(false);
      const state = scanner.getState();
      // SCANNING = 2, PAUSED = 3
      if (state === 2 || state === 3) {
        await scanner.stop();
        try {
          scanner.clear();
        } catch {}
      }
    } catch {
      // Abaikan error transisi internal
    } finally {
      isStoppingRef.current = false;
    }
  }, []);

  const handleDetected = useCallback(
    async (decodedText: string) => {
      if (isDetectedRef.current) return;
      isDetectedRef.current = true;

      let cleaned = decodedText.trim();
      // Bersihkan Software Version suffix pada IMEI misal "351198920330096 / 01" -> "351198920330096"
      if (cleaned.includes("/")) {
        cleaned = cleaned.split("/")[0].trim();
      }
      if (!cleaned) {
        isDetectedRef.current = false;
        return;
      }

      playBeep();
      setLastScannedResult(cleaned);

      // Hentikan kamera sebelum menutup modal
      await safeStopScanner();

      onScanSuccessRef.current(cleaned);
      onOpenChangeRef.current(false);
    },
    [safeStopScanner]
  );

  // Toggle Torch / Lampu Senter
  const toggleTorch = async () => {
    const scanner = scannerInstanceRef.current;
    if (!scanner) return;
    try {
      const nextState = !torchOn;
      const capabilities = scanner.getRunningTrackCameraCapabilities();
      if (capabilities?.torchFeature && capabilities.torchFeature().isSupported()) {
        await capabilities.torchFeature().apply(nextState);
        setTorchOn(nextState);
      } else {
        await scanner.applyVideoConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setTorchOn(nextState);
      }
    } catch {
      toast.error("Lampu senter tidak didukung pada browser/kamera ini.");
    }
  };

  // Inisialisasi Scanner Kamera Live
  useEffect(() => {
    if (!open || mode !== "camera") {
      safeStopScanner();
      setManualInput("");
      setScannerError(null);
      setLastScannedResult(null);
      setHasTorch(false);
      setTorchOn(false);
      isDetectedRef.current = false;
      return;
    }

    isDetectedRef.current = false;
    setLastScannedResult(null);
    let isMounted = true;

    async function initScanner() {
      // Tunggu jika proses safeStopScanner sebelumnya masih berjalan
      let waitCount = 0;
      while (isStoppingRef.current && waitCount < 15) {
        await new Promise((r) => setTimeout(r, 100));
        waitCount++;
      }

      if (isStartingRef.current) return;
      isStartingRef.current = true;

      try {
        setScannerError(null);

        // Periksa izin mediaDevices
        if (!navigator?.mediaDevices?.getUserMedia) {
          const isLocalhost =
            typeof window !== "undefined" &&
            (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

          if (!isLocalhost && window.location.protocol !== "https:") {
            throw new Error(
              "Kamera live di HP membutuhkan HTTPS atau localhost. Gunakan tab 'Foto Kamera HP' di atas untuk membuka kamera HP langsung."
            );
          }
          throw new Error("Kamera tidak didukung atau izin belum diberikan pada browser ini.");
        }

        // Hentikan dan bersihkan stream media apa pun yang masih aktif di DOM
        try {
          const existingVideos = document.querySelectorAll("video");
          existingVideos.forEach((v) => {
            if (v.srcObject instanceof MediaStream) {
              v.srcObject.getTracks().forEach((t) => {
                try {
                  t.stop();
                } catch {}
              });
              v.srcObject = null;
            }
          });
        } catch {}

        await safeStopScanner();
        // Berikan jeda singkat agar driver kamera di perangkat melepas exclusive lock
        await new Promise((r) => setTimeout(r, 200));
        if (!isMounted) return;

        // Inisialisasi Html5Qrcode dengan BarcodeDetector native & SEMUA format barcode garis (1D) dan barcode kotak (2D)
        const html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: ALL_SUPPORTED_FORMATS,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerInstanceRef.current = html5QrCode;

        const qrboxCalc = (viewfinderWidth: number, viewfinderHeight: number) => {
          // Bounding box horizontal lebar yang mencakup barcode garis panjang maupun barcode kotak (QR)
          const width = Math.min(viewfinderWidth - 20, Math.max(260, Math.floor(viewfinderWidth * 0.9)));
          const height = Math.min(viewfinderHeight - 20, Math.max(140, Math.floor(viewfinderHeight * 0.65)));
          return { width, height };
        };

        const scanSuccessCb = (decodedText: string) => {
          if (isMounted) {
            handleDetected(decodedText);
          }
        };

        let started = false;

        // Tentukan konfigurasi kamera:
        // Jika user memilih ID kamera spesifik dari dropdown, gunakan ID tersebut.
        // Jika tidak, prioritaskan { facingMode } yang secara default adalah "environment" (Kamera Belakang di HP)!
        const targetCameraConfig: any = selectedCameraId
          ? selectedCameraId
          : { facingMode: facingMode };

        // Coba 1: Mulai dengan target camera dan resolusi ideal
        try {
          await html5QrCode.start(
            targetCameraConfig,
            {
              fps: 25,
              qrbox: qrboxCalc,
              aspectRatio: 1.777,
              videoConstraints: selectedCameraId
                ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                  }
                : {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                  },
            },
            scanSuccessCb,
            () => {}
          );
          started = true;
        } catch (err1) {
          console.warn("Camera start attempt 1 failed, trying attempt 2...", err1);
        }

        // Coba 2: Tanpa videoConstraints resolusi tambahan (default resolusi perangkat)
        if (!started && isMounted) {
          try {
            await html5QrCode.start(
              targetCameraConfig,
              {
                fps: 20,
                qrbox: qrboxCalc,
                aspectRatio: 1.777,
              },
              scanSuccessCb,
              () => {}
            );
            started = true;
          } catch (err2) {
            console.warn("Camera start attempt 2 failed, trying fallback...", err2);
          }
        }

        // Coba 3: Jika target kamera belakang gagal (misal laptop/PC yang hanya punya webcam depan)
        if (!started && isMounted && !selectedCameraId) {
          const fallbackMode = facingMode === "environment" ? "user" : "environment";
          try {
            await html5QrCode.start(
              { facingMode: fallbackMode },
              {
                fps: 20,
                qrbox: qrboxCalc,
              },
              scanSuccessCb,
              () => {}
            );
            started = true;
            setFacingMode(fallbackMode);
          } catch (err3) {
            console.warn("Camera start attempt 3 (fallback facing) failed...", err3);
          }
        }

        // Coba 4: Fallback terakhir menggunakan daftar kamera pertama yang terdeteksi
        if (!started && isMounted) {
          try {
            const availDevices = await Html5Qrcode.getCameras().catch(() => []);
            if (availDevices && availDevices.length > 0) {
              await html5QrCode.start(
                availDevices[0].id,
                {
                  fps: 20,
                  qrbox: qrboxCalc,
                },
                scanSuccessCb,
                () => {}
              );
              started = true;
            }
          } catch (err4) {
            console.warn("Camera start attempt 4 failed...", err4);
          }
        }

        if (!started && isMounted) {
          throw new Error("Tidak dapat menyalakan kamera. Pastikan izin kamera telah diaktifkan di browser.");
        }

        // Ambil daftar perangkat kamera setelah izin kamera aktif (agar label terbaca lengkap dan jelas)
        if (started && isMounted) {
          try {
            const updatedDevices = await Html5Qrcode.getCameras().catch(() => []);
            if (updatedDevices && updatedDevices.length > 0) {
              const formatted = updatedDevices.map((d, idx) => {
                let lbl = d.label || `Kamera ${idx + 1}`;
                const low = lbl.toLowerCase();
                if (low.includes("back") || low.includes("rear") || low.includes("environment")) {
                  if (!low.includes("belakang")) {
                    lbl = `Kamera Belakang (${lbl})`;
                  }
                } else if (low.includes("front") || low.includes("user")) {
                  if (!low.includes("depan")) {
                    lbl = `Kamera Depan (${lbl})`;
                  }
                }
                return { id: d.id, label: lbl };
              });
              setCameras(formatted);
            }
          } catch {}

          // Periksa dukungan Torch/Flash
          try {
            const caps = html5QrCode.getRunningTrackCameraCapabilities();
            if (caps?.torchFeature && caps.torchFeature().isSupported()) {
              setHasTorch(true);
            } else {
              const track = (html5QrCode as any).renderedCamera?.cameraRunningTrack;
              if (track && typeof track.getCapabilities === "function") {
                const nativeCaps = track.getCapabilities();
                if ("torch" in nativeCaps) {
                  setHasTorch(true);
                }
              }
            }
          } catch {}
        }
      } catch (err: any) {
        if (!isMounted) return;
        const rawMsg = (err?.message || String(err)).toLowerCase();
        let msg = "Gagal mengakses kamera webcam.";

        if (
          rawMsg.includes("notreadableerror") ||
          rawMsg.includes("could not start video source") ||
          rawMsg.includes("device in use") ||
          rawMsg.includes("source unavailable")
        ) {
          msg =
            "Kamera tidak dapat dimulai karena sedang digunakan oleh aplikasi lain. Tutup aplikasi lain atau gunakan tab 'Foto Kamera HP' di atas.";
        } else if (
          rawMsg.includes("notallowederror") ||
          rawMsg.includes("permission denied")
        ) {
          msg =
            "Izin akses kamera belum diberikan. Klik ikon gembok / izin situs di bilah alamat browser untuk mengizinkan kamera.";
        } else if (
          rawMsg.includes("notfounderror") ||
          rawMsg.includes("devicesnotfound")
        ) {
          msg = "Tidak ditemukan perangkat kamera pada perangkat ini.";
        } else {
          msg = err?.message || String(err);
        }

        setScannerError(msg);
      } finally {
        isStartingRef.current = false;
      }
    }

    const timer = setTimeout(() => {
      initScanner();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      safeStopScanner();
    };
  }, [open, mode, selectedCameraId, facingMode, retryCount, handleDetected, safeStopScanner]);

  // Scan dari File Foto / Kamera HP Langsung
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    try {
      const decodedText = await scanBarcodeFromFile(file);
      if (decodedText) {
        toast.success(`Barcode berhasil dibaca: ${decodedText}`);
        handleDetected(decodedText);
      } else {
        toast.error("Tidak dapat mendeteksi barcode dari foto. Pastikan barcode jelas, tegak lurus, dan tidak buram.");
      }
    } catch {
      toast.error("Gagal membaca barcode dari foto. Silakan coba ambil foto lebih dekat.");
    } finally {
      setIsScanningFile(false);
      e.target.value = "";
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleDetected(manualInput.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg p-5 z-[110]"
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes barcode-laser {
                0%, 100% {
                  top: 8%;
                  opacity: 0.3;
                }
                50% {
                  top: 88%;
                  opacity: 1;
                }
              }
            `,
          }}
        />

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
            <ScanBarcode className="h-5 w-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Pilihan Mode: Kamera Live, Foto HP, Input Manual */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted/80 rounded-xl border border-border text-xs">
          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition ${
              mode === "camera"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Kamera Live</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition ${
              mode === "upload"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Foto Kamera HP</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-semibold transition ${
              mode === "manual"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span>Alat USB / Ketik</span>
          </button>
        </div>

        <div className="space-y-3 pt-1">
          {/* TAB 1: KAMERA LIVE */}
          {mode === "camera" && (
            <>
              {/* Baris Kontrol Kamera: Switcher Depan/Belakang & Senter */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {/* Tombol Cepat Balik Kamera Belakang / Depan */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleToggleFacingMode}
                    className="h-8 text-xs gap-1.5 shrink-0 bg-background hover:bg-muted font-medium border-border"
                    title="Ganti antara Kamera Belakang dan Kamera Depan"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-primary" />
                    <span>{facingMode === "environment" ? "Kamera Belakang" : "Kamera Depan"}</span>
                  </Button>

                  {/* Dropdown Pilihan Lensa Sensor Kamera */}
                  {cameras.length > 1 && (
                    <select
                      aria-label="Pilih Lensa Kamera"
                      value={selectedCameraId}
                      onChange={(e) => {
                        setSelectedCameraId(e.target.value);
                        setRetryCount((prev) => prev + 1);
                      }}
                      className="flex-1 h-8 rounded-lg border border-input bg-background px-2 text-xs truncate"
                    >
                      <option value="">Otomatis ({facingMode === "environment" ? "Belakang" : "Depan"})</option>
                      {cameras.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {hasTorch && (
                  <Button
                    type="button"
                    variant={torchOn ? "default" : "outline"}
                    size="sm"
                    onClick={toggleTorch}
                    className="h-8 text-xs gap-1.5 shrink-0"
                  >
                    {torchOn ? <ZapOff className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                    <span>{torchOn ? "Matikan Flash" : "Flash"}</span>
                  </Button>
                )}
              </div>

              {/* Viewport Kamera Live */}
              <div className="relative min-h-[250px] w-full overflow-hidden rounded-2xl border-2 border-dashed border-primary/40 bg-black flex items-center justify-center shadow-inner">
                {scannerError ? (
                  <div className="p-4 text-center text-xs text-muted-foreground space-y-3">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
                    <p className="text-foreground font-semibold max-w-sm mx-auto leading-relaxed">{scannerError}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Pilihan solusi: Coba akses ulang webcam atau gunakan foto kamera HP langsung:
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setScannerError(null);
                          setRetryCount((c) => c + 1);
                        }}
                        className="gap-1.5 text-xs h-9 px-3 w-full sm:w-auto"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Coba Akses Lagi</span>
                      </Button>
                      <label className="w-full sm:w-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-xs font-bold shadow-md hover:bg-primary/90 transition active:scale-95">
                        <Camera className="h-4 w-4" />
                        <span>{isScanningFile ? "Membaca Barcode..." : "Buka Kamera HP & Foto Barcode"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleFileUpload}
                          disabled={isScanningFile}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <>
                    <div id={containerId} className="w-full h-full overflow-hidden" />

                    {/* Viewfinder Reticle & Laser Line Animation */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="relative w-[88%] max-w-[420px] h-[65%] max-h-[220px] rounded-xl border border-white/20">
                        {/* 4 Corner Markers */}
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-md" />
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-md" />
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-md" />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-md" />

                        {/* Animated Laser Line */}
                        <div
                          className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981]"
                          style={{
                            animation: "barcode-laser 2.2s ease-in-out infinite",
                          }}
                        />

                        {/* Badge format indicator */}
                        <div className="absolute -bottom-7 inset-x-0 flex justify-center">
                          <span className="bg-black/70 backdrop-blur-sm text-emerald-400 text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                            1D Barcode & 2D QR Code Ready
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notifikasi Hasil Terdeteksi */}
                    {lastScannedResult && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center z-20">
                        <div className="bg-background/95 border border-emerald-500 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-emerald-600 font-bold font-mono">
                          <CheckCircle2 className="h-5 w-5" />
                          <span>{lastScannedResult}</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Panduan Pemindaian */}
              <div className="p-2.5 bg-muted/50 rounded-xl border border-border text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Tips Scan Barcode Garis & Barcode Kotak:</span>
                </p>
                <ul className="list-disc pl-4 space-y-0.5 leading-relaxed">
                  <li>
                    <strong>Barcode Garis (1D):</strong> Jaga jarak sekitar <strong>15 – 25 cm</strong> dari webcam laptop agar garis-garis tidak blur.
                  </li>
                  <li>
                    <strong>Barcode Kotak (QR):</strong> Dekatkan hingga kotak QR berada pas di tengah target.
                  </li>
                  <li>
                    <strong>Di Smartphone:</strong> Jika live camera dibatasi, gunakan tab <strong>&quot;Foto Kamera HP&quot;</strong>.
                  </li>
                </ul>
              </div>
            </>
          )}

          {/* TAB 2: FOTO KAMERA HP (NATIVE CAMERA) */}
          {mode === "upload" && (
            <div className="p-6 border-2 border-dashed border-border rounded-2xl text-center space-y-4 bg-muted/20">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Camera className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-foreground">Foto Barcode dengan Kamera HP</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Membuka aplikasi kamera bawaan HP dengan autofokus tajam dan lampu flash. 100% berfungsi di jaringan Wi-Fi lokal HTTP tanpa perlu HTTPS.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                <label className="w-full sm:w-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-xs font-bold shadow-md hover:bg-primary/90 transition active:scale-95">
                  {isScanningFile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <span>{isScanningFile ? "Membaca Barcode..." : "Buka Kamera HP & Foto Barcode"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isScanningFile}
                  />
                </label>

                <label className="w-full sm:w-auto inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-accent transition active:scale-95">
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Pilih dari Galeri Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isScanningFile}
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: INPUT MANUAL / SCANNER BARCODE USB */}
          {mode === "manual" && (
            <div className="space-y-3 p-4 bg-muted/20 rounded-2xl border border-border">
              <div>
                <p className="text-xs font-bold text-foreground">Scanner Barcode Hardware (USB / Bluetooth)</p>
                <p className="text-[11px] text-muted-foreground">
                  Tembakkan alat scanner barcode gun Anda langsung ke barcode stiker/dus. Nilai barcode akan langsung terinput otomatis.
                </p>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Tembak scanner USB atau ketik kode manual..."
                    className="text-sm font-mono tracking-wider h-10"
                  />
                  <Button type="submit" className="shrink-0 h-10 px-4 bg-primary text-primary-foreground font-semibold">
                    Input
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
