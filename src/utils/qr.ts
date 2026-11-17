/**
 * Pure TypeScript QR Code & PromptPay Payload Generator
 * ไม่มี External Dependency ทำงานได้ทั้งบน Browser, Canvas และ Node/Worker
 */

// CRC16-CCITT สำหรับคำนวณ Checksum ของ EMVCo PromptPay
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * สร้าง EMVCo Payload สำหรับ PromptPay QR Code ตามมาตรฐานธนาคารแห่งประเทศไทย
 * @param target เบอร์โทรศัพท์ (08x-xxx-xxxx) หรือเลขบัตรประชาชน/เลขประจำตัวผู้เสียภาษี 13 หลัก
 * @param amount ยอดเงิน (ถ้าไม่ระบุ หรือ <= 0 จะเป็น QR แบบไม่ระบุยอด)
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  const cleanTarget = target.replace(/[^0-9]/g, '');
  let tag29Subtag = '';

  if (cleanTarget.length === 10 && cleanTarget.startsWith('0')) {
    // เบอร์มือถือ 10 หลัก -> 0066 + 9 หลักหลัง
    const mobileNumber = `0066${cleanTarget.slice(1)}`;
    const len = mobileNumber.length.toString().padStart(2, '0');
    tag29Subtag = `01${len}${mobileNumber}`;
  } else if (cleanTarget.length === 13) {
    // เลขประจำตัวประชาชน / ผู้เสียภาษี 13 หลัก
    tag29Subtag = `0213${cleanTarget}`;
  } else {
    // เบอร์สั้น หรือรูปแบบอื่น fallback
    const mobile = cleanTarget.startsWith('0') ? `0066${cleanTarget.slice(1)}` : `0066${cleanTarget}`;
    tag29Subtag = `01${mobile.length.toString().padStart(2, '0')}${mobile}`;
  }

  const aid = '0016A000000677010111';
  const tag29 = `29${(aid.length + tag29Subtag.length).toString().padStart(2, '0')}${aid}${tag29Subtag}`;

  let payload = `0002010102${amount && amount > 0 ? '12' : '11'}${tag29}5303764`;

  if (amount && amount > 0) {
    const amountStr = amount.toFixed(2);
    payload += `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
  }

  payload += '5802TH6304';
  const checksum = crc16(payload);
  return `${payload}${checksum}`;
}

// ============================================================================
// Compact QR Code Matrix Generator (Byte Mode, Version 1-10, Error Correction M/L)
// ============================================================================

// GF(256) Math
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x] + GF_LOG[y]];
}

function polyMul(p1: number[], p2: number[]): number[] {
  const res = new Array(p1.length + p2.length - 1).fill(0);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      res[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return res;
}

function getGeneratorPoly(deg: number): number[] {
  let g = [1];
  for (let i = 0; i < deg; i++) {
    g = polyMul(g, [1, GF_EXP[i]]);
  }
  return g;
}

function calcEcc(data: number[], eccLen: number): number[] {
  const gen = getGeneratorPoly(eccLen);
  const info = [...data, ...new Array(eccLen).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = info[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        info[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return info.slice(data.length);
}

// Specs for QR Version 3 (29x29) and Version 4 (33x33) with ECC Level L
// QR Code capacity: V3-L = 55 bytes, V4-L = 80 bytes, V5-L = 108 bytes, V6-L = 136 bytes
interface QrSpec {
  version: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  eccBytes: number;
  alignPos: number[];
}

const QR_SPECS: QrSpec[] = [
  { version: 1, size: 21, totalBytes: 26, dataBytes: 19, eccBytes: 7, alignPos: [] },
  { version: 2, size: 25, totalBytes: 44, dataBytes: 34, eccBytes: 10, alignPos: [6, 18] },
  { version: 3, size: 29, totalBytes: 70, dataBytes: 55, eccBytes: 15, alignPos: [6, 22] },
  { version: 4, size: 33, totalBytes: 100, dataBytes: 80, eccBytes: 20, alignPos: [6, 26] },
  { version: 5, size: 37, totalBytes: 134, dataBytes: 108, eccBytes: 26, alignPos: [6, 30] },
  { version: 6, size: 41, totalBytes: 172, dataBytes: 136, eccBytes: 36, alignPos: [6, 34] },
];

export function createQrMatrix(text: string): boolean[][] {
  const enc = new TextEncoder().encode(text);
  const textBytes = Array.from(enc);

  // หา version ที่จุข้อมูลได้พอ
  const spec = QR_SPECS.find((s) => s.dataBytes >= textBytes.length + 3) || QR_SPECS[QR_SPECS.length - 1];
  const size = spec.size;

  // Header: Mode 8-bit byte (0100) + Character Count Indicator
  const bitArr: number[] = [];
  function pushBits(val: number, bits: number) {
    for (let i = bits - 1; i >= 0; i--) {
      bitArr.push((val >> i) & 1);
    }
  }

  pushBits(4, 4); // 0100 for Byte mode
  pushBits(textBytes.length, 8);
  for (const b of textBytes) {
    pushBits(b, 8);
  }

  // Terminator (up to 4 zeroes)
  const maxBits = spec.dataBytes * 8;
  const termLen = Math.min(4, maxBits - bitArr.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bitArr.length % 8 !== 0) {
    bitArr.push(0);
  }

  // Pad bytes: 0xEC, 0x11 alternating
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bitArr.length < maxBits) {
    pushBits(padPatterns[padIdx % 2], 8);
    padIdx++;
  }

  // Convert to byte array
  const dataBytes: number[] = [];
  for (let i = 0; i < bitArr.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bitArr[i + j];
    }
    dataBytes.push(b);
  }

  // Calculate ECC bytes
  const ecc = calcEcc(dataBytes, spec.eccBytes);
  const finalBytes = [...dataBytes, ...ecc];

  // Initialize Matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    new Array(size).fill(null)
  );
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    new Array(size).fill(false)
  );

  function setModule(r: number, c: number, val: boolean, fn = true) {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      matrix[r][c] = val;
      if (fn) isFunction[r][c] = true;
    }
  }

  // 1. Finder patterns (top-left, top-right, bottom-left)
  function drawFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
          const isBlack =
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          setModule(mr, mc, isBlack);
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // 2. Alignment patterns
  for (const ar of spec.alignPos) {
    for (const ac of spec.alignPos) {
      if (isFunction[ar][ac]) continue;
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isBlack = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
          setModule(ar + r, ac + c, isBlack);
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // 4. Dark module
  setModule(size - 8, 8, true);

  // 5. Reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) isFunction[8][i] = true;
    if (!isFunction[i][8]) isFunction[i][8] = true;
  }

  // 6. Data Placement (Up/Down zigzag from right to left)
  let byteIdx = 0;
  let bitPos = 7;
  let up = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip timing column
    const cols = [right, right - 1];
    const rows = up
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of cols) {
        if (!isFunction[r][c]) {
          let bit = false;
          if (byteIdx < finalBytes.length) {
            bit = ((finalBytes[byteIdx] >> bitPos) & 1) === 1;
            bitPos--;
            if (bitPos < 0) {
              bitPos = 7;
              byteIdx++;
            }
          }
          // Apply Mask Pattern 0: (row + col) % 2 === 0
          if ((r + c) % 2 === 0) {
            bit = !bit;
          }
          matrix[r][c] = bit;
        }
      }
    }
    up = !up;
  }

  // 7. Format Information (Mask 0 + Error Correction L = 01 000 -> 0x08)
  // Format info code with BCH error correction and XOR mask 0x5412: 0x77C4
  const formatBits = 0x77c4;
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> (14 - i)) & 1) === 1;
    // Top-left
    if (i <= 5) setModule(8, i, bit);
    else if (i === 6) setModule(8, 7, bit);
    else if (i <= 8) setModule(8, 8 - (i - 7), bit);
    else setModule(14 - i, 8, bit);

    // Split around corners
    if (i < 8) setModule(size - 1 - i, 8, bit);
    else setModule(8, size - 15 + i, bit);
  }

  return matrix.map((row) => row.map((m) => !!m));
}

/**
 * วาด QR Matrix ลงบน HTML5 Canvas
 */
export function drawQrToCanvas(
  ctx: CanvasRenderingContext2D,
  matrix: boolean[][],
  x: number,
  y: number,
  size: number,
  fgColor = '#4a3228',
  bgColor = '#ffffff'
) {
  const n = matrix.length;
  const cellSize = size / n;

  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, size, size);

  ctx.fillStyle = fgColor;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(
          Math.floor(x + c * cellSize),
          Math.floor(y + r * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize)
        );
      }
    }
  }
}
