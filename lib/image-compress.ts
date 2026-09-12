/**
 * lib/image-compress.ts
 * Utilitas kompresi gambar instan di sisi browser (Client-Side).
 *
 * Mengubah foto kamera smartphone resolusi tinggi (4MP-48MP, 3MB-15MB)
 * menjadi ukuran optimal ~80KB-150KB (WebP/JPEG, max 1200px) dalam hitungan milidetik
 * menggunakan GPU Canvas browser, sehingga proses upload menjadi instan (<100ms)
 * dan hemat penyimpanan server.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.82 } = options;

  // Jika bukan file gambar atau format SVG/GIF, kembalikan apa adanya
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/svg+xml" ||
    file.type === "image/gif"
  ) {
    return file;
  }

  // Jika ukuran file sudah sangat kecil (< 120KB), tidak perlu dikompres lagi
  if (file.size < 120 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Hitung dimensi baru proporsional jika melebihi batas maksimum
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      // Kualitas rendering tinggi (bicubic smooth interpolation)
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      const baseName = file.name.replace(/\.[^/.]+$/, "");

      // Prioritaskan WebP (rasio kompresi terbaik di browser modern)
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob && webpBlob.size < file.size) {
            resolve(new File([webpBlob], `${baseName}.webp`, { type: "image/webp" }));
          } else {
            // Fallback ke JPEG jika WebP tidak lebih kecil
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob && jpegBlob.size < file.size) {
                  resolve(new File([jpegBlob], `${baseName}.jpg`, { type: "image/jpeg" }));
                } else {
                  resolve(file);
                }
              },
              "image/jpeg",
              quality
            );
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
