import { describe, expect, it } from 'vitest';
import { encodeQr, qrSvgPath, type ErrorCorrection, type QrCode } from './qr';

/*
 * ถอดรหัส QR กลับด้วยโค้ดที่เขียนแยกจากตัวเข้ารหัส (ตามมาตรฐาน ISO/IEC 18004 โดยตรง)
 * รองรับ version 1–4 ซึ่งพอสำหรับลิงก์สติกเกอร์ /q/<รหัส> · ตรวจ Reed–Solomon ด้วย syndrome
 * ไม่ใช่การหารพหุนามแบบตัวเข้ารหัส จึงจับความผิดพลาดของตัวเข้ารหัสได้จริง
 */

// จำนวนบล็อกและ data codeword ต่อบล็อก (ตาราง 9 ของมาตรฐาน) · codeword ทั้งหมด v1–v4 = 26/44/70/100
const TOTAL_CODEWORDS = [0, 26, 44, 70, 100];
const BLOCKS: Record<string, [blocks: number, dataPerBlock: number]> = {
  '1L': [1, 19],
  '1M': [1, 16],
  '1Q': [1, 13],
  '1H': [1, 9],
  '2L': [1, 34],
  '2M': [1, 28],
  '2Q': [1, 22],
  '2H': [1, 16],
  '3L': [1, 55],
  '3M': [1, 44],
  '3Q': [2, 17],
  '3H': [2, 13],
  '4L': [1, 80],
  '4M': [2, 32],
  '4Q': [2, 24],
  '4H': [4, 9],
};
const LEVEL_OF_FORMAT_BITS: ErrorCorrection[] = ['M', 'L', 'H', 'Q'];

// mask ตามนิยามในมาตรฐาน: i = แถว, j = คอลัมน์
const MASKS: ((i: number, j: number) => boolean)[] = [
  (i, j) => (i + j) % 2 === 0,
  (i) => i % 2 === 0,
  (_i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0,
];

// GF(256) ด้วยตาราง log/antilog ของ x^8 + x^4 + x^3 + x^2 + 1
const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
for (let i = 0, x = 1; i < 255; i++, x = x & 0x80 ? ((x << 1) ^ 0x11d) & 0xff : x << 1) {
  EXP[i] = x;
  LOG[x] = i;
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function syndromes(block: number[], eccLength: number) {
  return Array.from({ length: eccLength }, (_, power) =>
    block.reduce((sum, codeword) => mul(sum, EXP[power]) ^ codeword, 0),
  );
}

function functionModules(size: number, version: number) {
  const reserved = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const mark = (row: number, col: number, height: number, width: number) => {
    for (let r = row; r < row + height; r++) for (let c = col; c < col + width; c++) reserved[r][c] = true;
  };
  mark(0, 0, 9, 9); // finder + separator + format (ซ้ายบน)
  mark(0, size - 8, 9, 8); // ขวาบน
  mark(size - 8, 0, 8, 9); // ซ้ายล่าง (รวม dark module)
  for (let k = 0; k < size; k++) reserved[6][k] = reserved[k][6] = true; // timing
  if (version >= 2) mark(size - 9, size - 9, 5, 5); // alignment pattern เดียวของ v2–v6
  return reserved;
}

function formatWord(qr: QrCode) {
  const m = qr.modules;
  const n = qr.size;
  const at = (row: number, col: number) => (m[row][col] ? 1 : 0);
  // สำเนาที่ 1 รอบ finder ซ้ายบน / สำเนาที่ 2 แบ่งอยู่ใต้ขวาบนและข้างซ้ายล่าง (บิต 0 = LSB)
  const first = [0, 1, 2, 3, 4, 5, 7, 8]
    .map((row) => at(row, 8))
    .concat([7, 5, 4, 3, 2, 1, 0].map((col) => at(8, col)));
  const second = Array.from({ length: 8 }, (_, k) => at(8, n - 1 - k)).concat(
    Array.from({ length: 7 }, (_, k) => at(n - 7 + k, 8)),
  );
  const value = (bits: number[]) => bits.reduce((sum, b, k) => sum | (b << k), 0);
  return { first: value(first), second: value(second) };
}

function bchFormat(data: number) {
  let remainder = data << 10;
  for (let bit = 14; bit >= 10; bit--) if (remainder & (1 << bit)) remainder ^= 0x537 << (bit - 10);
  return ((data << 10) | remainder) ^ 0x5412;
}

function decode(qr: QrCode) {
  const { size, version } = qr;
  const format = formatWord(qr);
  expect(format.first).toBe(format.second);
  const data = [...Array(32).keys()].find((candidate) => bchFormat(candidate) === format.first);
  expect(data, 'format information ต้องเป็นคำที่ถูกต้องตาม BCH(15,5)').toBeDefined();
  const level = LEVEL_OF_FORMAT_BITS[(data as number) >> 3];
  const mask = MASKS[(data as number) & 7];

  const reserved = functionModules(size, version);
  const bits: number[] = [];
  let upward = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5;
    for (let k = 0; k < size; k++) {
      const row = upward ? size - 1 - k : k;
      for (const col of [right, right - 1]) {
        if (!reserved[row][col]) bits.push(qr.modules[row][col] !== mask(row, col) ? 1 : 0);
      }
    }
    upward = !upward;
  }
  const codewords = Array.from({ length: TOTAL_CODEWORDS[version] }, (_, k) =>
    bits.slice(k * 8, k * 8 + 8).reduce((byte, b) => (byte << 1) | b, 0),
  );

  const [blockCount, dataPerBlock] = BLOCKS[`${version}${level}`];
  const eccPerBlock = TOTAL_CODEWORDS[version] / blockCount - dataPerBlock;
  const blocks = Array.from({ length: blockCount }, (_, b) => [
    ...Array.from({ length: dataPerBlock }, (_, k) => codewords[k * blockCount + b]),
    ...Array.from(
      { length: eccPerBlock },
      (_, k) => codewords[blockCount * dataPerBlock + k * blockCount + b],
    ),
  ]);
  for (const block of blocks) expect(syndromes(block, eccPerBlock).every((s) => s === 0)).toBe(true);

  const stream = blocks
    .flatMap((block) => block.slice(0, dataPerBlock))
    .flatMap((byte) => Array.from({ length: 8 }, (_, k) => (byte >> (7 - k)) & 1));
  let offset = 0;
  const read = (length: number) => {
    const value = stream.slice(offset, offset + length).reduce((sum, b) => (sum << 1) | b, 0);
    offset += length;
    return value;
  };
  expect(read(4), 'ต้องเป็น byte mode').toBe(0b0100);
  const bytes = Uint8Array.from({ length: read(8) }, () => read(8));
  return { level, text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
}

describe('QR encoder สำหรับสติกเกอร์แจ้งซ่อม', () => {
  const cases: [string, ErrorCorrection][] = [
    ['https://repair.csmju.ac.th/q/ABCD2345', 'Q'],
    ['http://localhost:3102/q/HJKM6789', 'Q'],
    ['https://repair.csmju.ac.th/requests/7f3c2d1e-9a4b-4c5d-8e6f-0a1b2c3d4e5f', 'L'],
    ['แจ้งซ่อม อาคาร CS ห้อง 301', 'M'],
    ['RP-6909-0042', 'H'],
  ];

  it.each(cases)('decodes back to the same text: %s (%s)', (text, level) => {
    const qr = encodeQr(text, level);
    expect(qr.size).toBe(17 + 4 * qr.version);
    expect(qr.version).toBeLessThanOrEqual(4);
    expect(decode(qr)).toEqual({ level, text });
  });

  it('draws the three finder patterns and alternating timing patterns', () => {
    const qr = encodeQr('https://repair.csmju.ac.th/q/ABCD2345');
    const n = qr.size;
    for (const [row0, col0] of [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ]) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
          expect(qr.modules[row0 + r][col0 + c]).toBe(ring !== 2);
        }
      }
    }
    for (let k = 8; k < n - 8; k++) {
      expect(qr.modules[6][k]).toBe(k % 2 === 0);
      expect(qr.modules[k][6]).toBe(k % 2 === 0);
    }
    expect(qr.modules[n - 8][8]).toBe(true); // dark module
  });

  it('picks the smallest version whose byte capacity fits (Q: 11/20/32/46 bytes)', () => {
    const versionFor = (length: number) => encodeQr('A'.repeat(length), 'Q').version;
    expect([versionFor(11), versionFor(12), versionFor(20), versionFor(21)]).toEqual([1, 2, 2, 3]);
    expect([versionFor(32), versionFor(33), versionFor(46)]).toEqual([3, 4, 4]);
    // UTF-8 ของอักษรไทยใช้ 3 ไบต์ต่อตัว
    expect(encodeQr('ก'.repeat(4), 'Q').version).toBe(2);
  });

  it('supports long payloads up to version 40 and rejects anything larger', () => {
    const big = encodeQr('x'.repeat(1273), 'H');
    expect(big.version).toBe(40);
    expect(big.size).toBe(177);
    expect(() => encodeQr('x'.repeat(1274), 'H')).toThrow('ยาวเกิน');
  });

  it('builds an SVG path with a 4-module quiet zone', () => {
    const qr = encodeQr('RP-6909-0042', 'M');
    const { path, viewBox } = qrSvgPath(qr);
    const dark = qr.modules.flat().filter(Boolean).length;
    expect(viewBox).toBe(qr.size + 8);
    expect(path.match(/M/g)).toHaveLength(dark);
    expect(path.startsWith('M4,4h1v1h-1z')).toBe(true); // มุมบนซ้ายของ finder
  });
});
