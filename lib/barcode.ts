/**
 * lib/barcode.ts
 * Pure TypeScript Code 128 and 2D Barcode (QR Code) Vector SVG Generators.
 * Generates crisp, scannable SVG barcodes for 15-digit IMEI and SKU labels on thermal or desktop printers.
 */

import QRCode from "qrcode";

// Code 128 Barcode Symbol Patterns (widths of 6 alternate bars & spaces: B1, S1, B2, S2, B3, S3)
const CODE128_PATTERNS: string[] = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
  "114131", "311141", "411131", "211412", "211214", "211232", "233111"  // 100-106 (104: Start B, 105: Start C, 106: Stop)
];

const STOP_PATTERN = "2331112"; // 13 modules for stop symbol
const START_B = 104;
const START_C = 105;

export interface BarcodeOptions {
  includeText?: boolean; // Whether to render human readable text below barcode
  fontSize?: number; // Font size of text
}

/**
 * Encodes text into Code 128 barcode symbol codes and generates an SVG string.
 */
export function generateBarcodeSvg(data: string, options: BarcodeOptions = {}): string {
  if (!data || data.trim() === "") return "";

  const text = data.trim();
  const isAllDigits = /^\d+$/.test(text);
  const useCodeC = isAllDigits && text.length % 2 === 0;

  const codes: number[] = [];

  if (useCodeC) {
    // Subset C: pairs of numeric digits
    codes.push(START_C);
    for (let i = 0; i < text.length; i += 2) {
      codes.push(parseInt(text.substr(i, 2), 10));
    }
  } else {
    // Subset B: standard ASCII
    codes.push(START_B);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i) - 32;
      codes.push(Math.max(0, Math.min(code, 95)));
    }
  }

  // Calculate checksum
  let checksum = codes[0];
  for (let i = 1; i < codes.length; i++) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);

  // Build binary pattern (1 for bar, 0 for space)
  let binaryString = "";
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code] || CODE128_PATTERNS[0];
    for (let i = 0; i < pattern.length; i++) {
      const width = parseInt(pattern[i], 10);
      const isBar = i % 2 === 0;
      binaryString += (isBar ? "1" : "0").repeat(width);
    }
  }

  // Append Stop symbol
  for (let i = 0; i < STOP_PATTERN.length; i++) {
    const width = parseInt(STOP_PATTERN[i], 10);
    const isBar = i % 2 === 0;
    binaryString += (isBar ? "1" : "0").repeat(width);
  }

  // Dimensions & Quiet zones
  const quietZone = 10;
  const totalModules = binaryString.length + quietZone * 2;
  const barHeight = options.includeText ? 42 : 52;
  const totalHeight = options.includeText ? 62 : 52;

  let rects = "";
  let inBar = false;
  let barStart = 0;

  for (let i = 0; i < binaryString.length; i++) {
    if (binaryString[i] === "1") {
      if (!inBar) {
        inBar = true;
        barStart = i + quietZone;
      }
    } else {
      if (inBar) {
        inBar = false;
        const barWidth = i + quietZone - barStart;
        rects += `<rect x="${barStart}" y="0" width="${barWidth}" height="${barHeight}" fill="#000000" />`;
      }
    }
  }
  if (inBar) {
    const barWidth = binaryString.length + quietZone - barStart;
    rects += `<rect x="${barStart}" y="0" width="${barWidth}" height="${barHeight}" fill="#000000" />`;
  }

  const textElement = options.includeText
    ? `<text x="${totalModules / 2}" y="${barHeight + 14}" text-anchor="middle" font-family="monospace" font-size="${options.fontSize || 10}" font-weight="bold" fill="#000000">${text}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalHeight}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${rects}${textElement}</svg>`;
}

export interface QrCodeOptions {
  margin?: number; // Margin quiet zone modules (default 1)
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
}

/**
 * Generates razor-sharp, crisp-edges 2D Barcode (QR Code) Vector SVG string.
 * Optimized for high-speed thermal label printing (e.g. 60x40mm labels).
 */
export function generateQrCodeSvg(data: string, options: QrCodeOptions = {}): string {
  if (!data || data.trim() === "") return "";
  const text = data.trim();
  const level = options.errorCorrectionLevel || "M";
  const qr = QRCode.create(text, { errorCorrectionLevel: level });
  const size = qr.modules.size;
  const margin = options.margin ?? 1;
  const total = size + margin * 2;

  let path = "";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.modules.get(r, c)) {
        path += `M${c + margin},${r + margin}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="100%" height="100%" shape-rendering="crispEdges"><path fill="#000000" d="${path}"/></svg>`;
}

