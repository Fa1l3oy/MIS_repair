/**
 * QR Code encoder (ISO/IEC 18004) แบบ byte mode — เขียนเองเพราะ whitelist ของ stack ไม่มีไลบรารี QR
 * ใช้สร้างสติกเกอร์ QR ของจุดแจ้งซ่อม · อ้างอิงโครงอัลกอริทึมจาก "QR Code generator" ของ Project Nayuki (MIT)
 * รองรับ version 1–40 และ error correction L/M/Q/H · ผลลัพธ์เป็นเมทริกซ์ boolean (true = โมดูลดำ)
 */
export type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

const ECL_ORDINAL: Record<ErrorCorrection, number> = { L: 0, M: 1, Q: 2, H: 3 };
const ECL_FORMAT_BITS: Record<ErrorCorrection, number> = { L: 1, M: 0, Q: 3, H: 2 };

// ตารางจากมาตรฐาน (ตัวแรกของแต่ละแถวไม่ใช้ — ดัชนีคือ version)
const ECC_CODEWORDS_PER_BLOCK = [
  [
    -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  [
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  ],
  [
    -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30,
    28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  [
    -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
];
const NUM_ERROR_CORRECTION_BLOCKS = [
  [
    -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16,
    17, 18, 19, 19, 20, 21, 22, 24, 25,
  ],
  [
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28,
    29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
  [
    -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35,
    38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68,
  ],
  [
    -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42,
    45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81,
  ],
];

const bit = (value: number, index: number) => ((value >>> index) & 1) !== 0;

function numRawDataModules(version: number) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function numDataCodewords(version: number, ecl: ErrorCorrection) {
  const e = ECL_ORDINAL[ecl];
  return (
    Math.floor(numRawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[e][version] * NUM_ERROR_CORRECTION_BLOCKS[e][version]
  );
}

/** คูณใน GF(2^8) มอดุโล x^8 + x^4 + x^3 + x^2 + 1 */
function gfMultiply(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree: number) {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]) {
  const result = divisor.map(() => 0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coefficient, i) => (result[i] ^= gfMultiply(coefficient, factor)));
  }
  return result;
}

function alignmentPositions(version: number, size: number) {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

function encodeData(bytes: Uint8Array, ecl: ErrorCorrection, minVersion: number) {
  for (let version = minVersion; version <= 40; version++) {
    const countBits = version <= 9 ? 8 : 16;
    const usedBits = 4 + countBits + bytes.length * 8;
    const capacityBits = numDataCodewords(version, ecl) * 8;
    if (bytes.length >= 1 << countBits || usedBits > capacityBits) continue;

    const bits: number[] = [];
    const append = (value: number, length: number) => {
      for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
    };
    append(0b0100, 4); // byte mode
    append(bytes.length, countBits);
    bytes.forEach((byte) => append(byte, 8));
    append(0, Math.min(4, capacityBits - bits.length)); // terminator
    append(0, (8 - (bits.length % 8)) % 8);
    for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) append(pad, 8);

    const codewords: number[] = [];
    for (let i = 0; i < bits.length; i += 8) codewords.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    return { version, codewords };
  }
  throw new Error('ข้อความยาวเกินกว่าจะใส่ใน QR Code ได้');
}

function withErrorCorrection(data: number[], version: number, ecl: ErrorCorrection) {
  const e = ECL_ORDINAL[ecl];
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[e][version];
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[e][version];
  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);
  const divisor = reedSolomonDivisor(blockEccLen);

  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const block = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += block.length;
    const ecc = reedSolomonRemainder(block, divisor);
    if (i < numShortBlocks) block.push(0);
    blocks.push(block.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]);
    });
  }
  return result;
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

class Matrix {
  readonly modules: boolean[][];
  private readonly reserved: boolean[][];

  constructor(readonly size: number) {
    this.modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
    this.reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  }

  setFunction(x: number, y: number, dark: boolean) {
    this.modules[y][x] = dark;
    this.reserved[y][x] = true;
  }

  isFunction(x: number, y: number) {
    return this.reserved[y][x];
  }

  clone() {
    const copy = new Matrix(this.size);
    for (let y = 0; y < this.size; y++) {
      copy.modules[y] = [...this.modules[y]];
      copy.reserved[y] = [...this.reserved[y]];
    }
    return copy;
  }
}

function drawFunctionPatterns(matrix: Matrix, version: number) {
  const { size } = matrix;
  for (let i = 0; i < size; i++) {
    matrix.setFunction(6, i, i % 2 === 0);
    matrix.setFunction(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size)
          matrix.setFunction(x, y, distance !== 2 && distance !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  const positions = alignmentPositions(version, size);
  const last = positions.length - 1;
  positions.forEach((py, i) =>
    positions.forEach((px, j) => {
      const corner = (i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0);
      if (corner) return;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++)
          matrix.setFunction(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }),
  );

  drawFormatBits(matrix, 'L', 0); // จองตำแหน่งไว้ก่อน ค่าจริงเขียนทับหลังเลือก mask
  if (version >= 7) {
    let remainder = version;
    for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
    const bits = (version << 12) | remainder;
    for (let i = 0; i < 18; i++) {
      const dark = bit(bits, i);
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      matrix.setFunction(a, b, dark);
      matrix.setFunction(b, a, dark);
    }
  }
}

function drawFormatBits(matrix: Matrix, ecl: ErrorCorrection, mask: number) {
  const data = (ECL_FORMAT_BITS[ecl] << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  const bits = ((data << 10) | remainder) ^ 0x5412;
  const { size } = matrix;

  for (let i = 0; i <= 5; i++) matrix.setFunction(8, i, bit(bits, i));
  matrix.setFunction(8, 7, bit(bits, 6));
  matrix.setFunction(8, 8, bit(bits, 7));
  matrix.setFunction(7, 8, bit(bits, 8));
  for (let i = 9; i < 15; i++) matrix.setFunction(14 - i, 8, bit(bits, i));

  for (let i = 0; i < 8; i++) matrix.setFunction(size - 1 - i, 8, bit(bits, i));
  for (let i = 8; i < 15; i++) matrix.setFunction(8, size - 15 + i, bit(bits, i));
  matrix.setFunction(8, size - 8, true); // dark module
}

function drawCodewords(matrix: Matrix, codewords: number[]) {
  const { size } = matrix;
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!matrix.isFunction(x, y) && i < codewords.length * 8) {
          matrix.modules[y][x] = bit(codewords[i >>> 3], 7 - (i & 7));
          i++;
        }
      }
    }
  }
}

function applyMask(matrix: Matrix, mask: number) {
  const test = MASKS[mask];
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (!matrix.isFunction(x, y) && test(x, y)) matrix.modules[y][x] = !matrix.modules[y][x];
    }
  }
}

/** คะแนนโทษตามมาตรฐาน (N1–N4) — ยิ่งต่ำยิ่งสแกนง่าย */
function penalty(modules: boolean[][]) {
  const size = modules.length;
  let score = 0;
  const lines: boolean[][] = [];
  for (let i = 0; i < size; i++) {
    lines.push(modules[i]);
    lines.push(modules.map((row) => row[i]));
  }
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && line[i] === line[i - 1]) run++;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    const text = line.map((dark) => (dark ? '1' : '0')).join('');
    for (const pattern of ['10111010000', '00001011101']) {
      for (let from = text.indexOf(pattern); from !== -1; from = text.indexOf(pattern, from + 1)) score += 40;
    }
  }
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = modules[y][x];
      if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
    }
  }
  const dark = modules.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

export type QrCode = { version: number; size: number; modules: boolean[][] };

export function encodeQr(text: string, ecl: ErrorCorrection = 'Q', minVersion = 1): QrCode {
  const bytes = new TextEncoder().encode(text);
  const { version, codewords } = encodeData(bytes, ecl, minVersion);
  const size = version * 4 + 17;
  const base = new Matrix(size);
  drawFunctionPatterns(base, version);
  drawCodewords(base, withErrorCorrection(codewords, version, ecl));

  let best: Matrix | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = base.clone();
    applyMask(candidate, mask);
    drawFormatBits(candidate, ecl, mask);
    const score = penalty(candidate.modules);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return { version, size, modules: (best as Matrix).modules };
}

/** path ของ SVG (1 หน่วย = 1 โมดูล) พร้อมขอบว่างรอบภาพ (quiet zone) ตามมาตรฐาน 4 โมดูล */
export function qrSvgPath(qr: QrCode, border = 4) {
  const parts: string[] = [];
  qr.modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) parts.push(`M${x + border},${y + border}h1v1h-1z`);
    }),
  );
  return { path: parts.join(''), viewBox: qr.size + border * 2 };
}
