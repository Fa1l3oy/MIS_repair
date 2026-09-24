/**
 * ข้อมูลตัวอย่างที่ทำให้ระบบดูเหมือนใช้งานจริงมาแล้ว 6 เดือน — สำหรับสาธิตและทดสอบหน้าจอ
 *
 *   pnpm --filter backend db:seed:demo              # เพิ่มข้อมูลตัวอย่าง (สร้างอาคาร/หมวดหมู่ให้ถ้ายังไม่มี)
 *   pnpm --filter backend db:seed:demo -- --clean   # ลบทุกอย่างที่สคริปต์นี้สร้าง รวมไฟล์รูป
 *
 * - คนในข้อมูลตัวอย่างเป็นโปรไฟล์ที่ core_user_id ขึ้นต้นด้วย "demo-" อีเมลโดเมน .invalid
 *   ไม่มีบัญชีใน Core Hub จึงเข้าสู่ระบบไม่ได้
 * - บัญชีจริงที่เคยเข้าระบบนี้แล้ว (มีโปรไฟล์) ร่วมในงานช่วง 2 เดือนหลัง: ช่างที่ได้รับแต่งตั้งรับงานบางส่วน
 *   ผู้ดูแลระบบมอบหมายงานบางส่วน และได้รับการแจ้งเตือนเหมือนใช้งานจริง
 * - รูปก่อน/หลังซ่อมคัดลอกจาก prisma/demo-photos ไปที่ UPLOAD_DIR ตั้งชื่อใหม่แบบเดียวกับไฟล์ที่อัปโหลดจริง
 * - ใช้ได้เฉพาะฐานข้อมูลในเครื่อง เว้นแต่จะใส่ --allow-remote
 */
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, stat, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { ActivityType, Priority, RequestStatus } from '../generated/prisma/enums';
import { displayNameOf } from '../src/profiles/profile.view';
import { PRIORITY_LABEL } from '../src/repair-requests/labels';
import { formatRequestCode, requestCodePrefix } from '../src/repair-requests/request-code';
import { SLA_HOURS } from '../src/repair-requests/sla';
import { CATEGORIES, createSeedClient, seedCatalog } from './seed';

const prisma = createSeedClient();

const DEMO = 'demo-';
const EMAIL_DOMAIN = '@demo.csmju.invalid';
/** รหัสสติกเกอร์ตัวอย่างขึ้นต้นแบบนี้ (ตัวอักษรชุดเดียวกับ qr_tags_code_check) */
const QR_PREFIX = 'DEMQ';
const QR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REQUEST_COUNT = 190;
const RECENT_COUNT = 14;
const HISTORY_DAYS = 180;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const PHOTO_DIR = resolve(__dirname, 'demo-photos');
const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? 'uploads');

// ---------- สุ่มแบบกำหนดซ้ำได้ ------------------------------------------------

let state = 20260924;
function rand() {
  state = (state * 1664525 + 1013904223) % 2 ** 32;
  return state / 2 ** 32;
}
const between = (a: number, b: number) => a + rand() * (b - a);
const chance = (p: number) => rand() < p;
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
function weighted<T>(entries: readonly (readonly [T, number])[]) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let r = rand() * total;
  for (const [value, weight] of entries) if ((r -= weight) < 0) return value;
  return entries[entries.length - 1][0];
}
/** ตัวคูณแบบ log-normal รอบค่ากลางที่กำหนด */
function lognormal(median: number) {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return median * Math.exp(0.55 * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
}
const pad = (n: number, width = 2) => String(n).padStart(width, '0');
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
function hash(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ (ch.codePointAt(0) ?? 0), 16777619) >>> 0;
  return h;
}

// ---------- สถานที่ -----------------------------------------------------------

type SpotKind =
  'classroom' | 'complab' | 'lab' | 'server' | 'meeting' | 'office' | 'teacherroom' | 'toilet' | 'corridor';

type PlaceDef = {
  name: string;
  floors: number;
  weight: number;
  spots: { kind: SpotKind; weight: number; names: (floor: number) => string[] }[];
};

const TOILETS = { kind: 'toilet' as const, weight: 2, names: () => ['ห้องน้ำชาย', 'ห้องน้ำหญิง'] };

/** ชื่ออาคารต้องตรงกับ seed.ts (อาคารที่ผู้ดูแลเพิ่มเองไม่ถูกใช้) */
const PLACES: PlaceDef[] = [
  {
    name: 'อาคารวิทยาการคอมพิวเตอร์',
    floors: 4,
    weight: 6,
    spots: [
      {
        kind: 'complab',
        weight: 6,
        names: (f) =>
          f <= 2 ? [`ห้องปฏิบัติการคอมพิวเตอร์ CS${f}01`, `ห้องปฏิบัติการคอมพิวเตอร์ CS${f}02`] : [],
      },
      { kind: 'lab', weight: 2, names: (f) => (f === 2 ? ['ห้องปฏิบัติการ IoT และระบบฝังตัว CS203'] : []) },
      { kind: 'server', weight: 1, names: (f) => (f === 1 ? ['ห้องเครือข่ายและเซิร์ฟเวอร์ CS104'] : []) },
      {
        kind: 'classroom',
        weight: 4,
        names: (f) =>
          f === 3 ? range(1, 4).map((n) => `ห้องเรียน CS30${n}`) : f === 1 ? ['ห้องบรรยาย CS103'] : [],
      },
      {
        kind: 'meeting',
        weight: 2,
        names: (f) => (f === 4 ? ['ห้องประชุมสาขา CS401', 'ห้องสัมมนา CS402'] : []),
      },
      {
        kind: 'office',
        weight: 2,
        names: (f) => (f === 1 ? ['สำนักงานสาขาวิชา CS105'] : f === 4 ? ['ห้องโครงงานนักศึกษา CS403'] : []),
      },
      TOILETS,
      { kind: 'corridor', weight: 1, names: () => ['โถงหน้าลิฟต์', 'ทางเดินหน้าห้องปฏิบัติการ'] },
    ],
  },
  {
    name: 'อาคารเรียนรวม 1',
    floors: 5,
    weight: 5,
    spots: [
      { kind: 'classroom', weight: 6, names: (f) => range(1, 8).map((n) => `ห้อง ${f}${pad(n)}`) },
      TOILETS,
      { kind: 'corridor', weight: 1, names: () => ['โถงหน้าลิฟต์', 'ทางเดินหน้าห้องเรียน'] },
    ],
  },
  {
    name: 'อาคารเรียนรวม 2',
    floors: 6,
    weight: 4,
    spots: [
      {
        kind: 'classroom',
        weight: 5,
        names: (f) => (f < 6 ? range(1, 6).map((n) => `ห้อง ${f}${pad(n)}`) : []),
      },
      { kind: 'meeting', weight: 2, names: (f) => (f === 6 ? ['ห้องบรรยายรวม 601', 'ห้องประชุม 602'] : []) },
      TOILETS,
      { kind: 'corridor', weight: 1, names: () => ['โถงหน้าลิฟต์', 'ทางเดินหน้าห้องเรียน'] },
    ],
  },
  {
    name: 'อาคารปฏิบัติการวิทยาศาสตร์',
    floors: 4,
    weight: 2,
    spots: [
      {
        kind: 'lab',
        weight: 4,
        names: (f) => [
          `ห้องปฏิบัติการเคมี ${f}01`,
          `ห้องปฏิบัติการชีววิทยา ${f}02`,
          `ห้องปฏิบัติการฟิสิกส์ ${f}03`,
        ],
      },
      { kind: 'classroom', weight: 1, names: (f) => [`ห้องบรรยาย ${f}05`] },
      TOILETS,
    ],
  },
  {
    name: 'อาคารสำนักงานและห้องพักอาจารย์',
    floors: 4,
    weight: 3,
    spots: [
      {
        kind: 'office',
        weight: 3,
        names: (f) => (f === 1 ? ['งานบริการการศึกษา', 'งานบริหารทั่วไป', 'งานพัสดุ'] : []),
      },
      {
        kind: 'teacherroom',
        weight: 4,
        names: (f) => (f >= 2 ? range(1, 8).map((n) => `ห้องพักอาจารย์ ${f}${pad(n)}`) : []),
      },
      { kind: 'meeting', weight: 1, names: (f) => (f === 1 ? ['ห้องรับรอง'] : [`ห้องประชุม ${f}10`]) },
      TOILETS,
      {
        kind: 'corridor',
        weight: 1,
        names: (f) => (f === 1 ? ['โถงต้อนรับ', 'โถงหน้าลิฟต์'] : ['โถงหน้าลิฟต์']),
      },
    ],
  },
];

// ---------- อาการเสีย ----------------------------------------------------------

type CategoryName = (typeof CATEGORIES)[number];
type Scene =
  | 'ac'
  | 'light'
  | 'socket'
  | 'switch'
  | 'faucet'
  | 'toilet'
  | 'drain'
  | 'monitor'
  | 'wifi'
  | 'printer'
  | 'projector'
  | 'mic'
  | 'speaker'
  | 'chair'
  | 'door'
  | 'ceiling'
  | 'floor'
  | 'sign'
  | 'elevator';

type Problem = {
  category: CategoryName;
  equipment: string;
  /** ชื่อไฟล์รูปใน prisma/demo-photos (<scene>-before-1.jpg ...) */
  scene: Scene;
  kinds: SpotKind[];
  /** เฉพาะจุดที่ชื่อตรง (เช่น ลิฟต์) */
  where?: RegExp;
  /** ต้นเลขครุภัณฑ์ — แต่ละจุดได้เลขของตัวเอง */
  asset?: string;
  weight: number;
  priority: [Priority, number][];
  descriptions: string[];
  progress: string[];
  fixes: string[];
  holds: string[];
};

const ROOMS: SpotKind[] = ['classroom', 'complab', 'lab', 'meeting', 'office', 'teacherroom'];

const PROBLEMS: Problem[] = [
  {
    category: 'เครื่องปรับอากาศ',
    equipment: 'เครื่องปรับอากาศ 24,000 BTU',
    scene: 'ac',
    kinds: ['classroom', 'complab', 'lab', 'meeting'],
    asset: '4120-001',
    weight: 9,
    priority: [
      ['MEDIUM', 4],
      ['HIGH', 5],
      ['URGENT', 1],
    ],
    descriptions: [
      'เปิดแล้วไม่เย็น มีแต่ลมออก ช่วงบ่ายห้องร้อนมากจนเรียนไม่ได้',
      'แอร์มีน้ำหยดลงโต๊ะแถวหน้า ต้องเอาถังมารองไว้',
      'มีเสียงดังผิดปกติตอนคอมเพรสเซอร์ทำงาน',
      'เปิดได้สักพักแล้วตัดเอง ไฟหน้าเครื่องกะพริบ',
    ],
    progress: [
      'เข้าตรวจสอบแล้ว น้ำยาแอร์รั่ว กำลังหาจุดรั่ว',
      'กำลังล้างแผงคอยล์เย็นและถาดน้ำทิ้ง',
      'ตรวจพบคาปาซิเตอร์เสื่อม กำลังเปลี่ยน',
    ],
    fixes: [
      'ล้างแผงคอยล์เย็น–คอยล์ร้อน และเติมน้ำยา R32 วัดลมออกได้ 12°C ใช้งานได้ปกติ',
      'ล้างท่อน้ำทิ้งที่อุดตันและปรับระดับตัวเครื่อง ไม่มีน้ำหยดแล้ว',
      'เปลี่ยนคาปาซิเตอร์คอมเพรสเซอร์ 35µF ทดสอบ 1 ชั่วโมง ทำงานปกติ',
      'เปลี่ยนเซนเซอร์อุณหภูมิคอยล์เย็น เครื่องไม่ตัดแล้ว',
    ],
    holds: [
      'รออะไหล่คาปาซิเตอร์จากผู้จำหน่าย 2–3 วัน',
      'รอผู้รับเหมาเข้าเติมน้ำยาและเชื่อมท่อ',
      'รอบอร์ดควบคุมจากศูนย์บริการ',
    ],
  },
  {
    category: 'เครื่องปรับอากาศ',
    equipment: 'เครื่องปรับอากาศ 12,000 BTU',
    scene: 'ac',
    kinds: ['teacherroom', 'office', 'server'],
    asset: '4120-001',
    weight: 6,
    priority: [
      ['LOW', 1],
      ['MEDIUM', 5],
      ['HIGH', 3],
    ],
    descriptions: [
      'แอร์ไม่เย็น เปิดทั้งวันอุณหภูมิไม่ลด',
      'รีโมทกดแล้วแอร์ไม่ตอบสนอง เปลี่ยนถ่านแล้ว',
      'น้ำแอร์หยดใส่โต๊ะทำงาน เอกสารเปียก',
    ],
    progress: ['ตรวจสอบแล้ว แผงคอยล์สกปรกมาก กำลังล้าง', 'กำลังตรวจแผงรับสัญญาณรีโมท'],
    fixes: [
      'ล้างแอร์ทั้งระบบและเติมน้ำยาเล็กน้อย เย็นปกติ',
      'เปลี่ยนแผงรับสัญญาณรีโมท ใช้งานได้ปกติ',
      'ล้างท่อน้ำทิ้งและเปลี่ยนถาดน้ำทิ้งที่แตก',
    ],
    holds: ['รอแผงรับสัญญาณจากศูนย์บริการ'],
  },
  {
    category: 'ไฟฟ้า / แสงสว่าง',
    equipment: 'โคมไฟ LED ตะแกรงฝ้าเพดาน',
    scene: 'light',
    kinds: [...ROOMS, 'corridor'],
    weight: 9,
    priority: [
      ['LOW', 3],
      ['MEDIUM', 5],
      ['HIGH', 1],
    ],
    descriptions: [
      'หลอดไฟดับ 3 ดวงด้านหลังห้อง อ่านหนังสือไม่เห็น',
      'ไฟกะพริบตลอดเวลา ปวดตามาก',
      'ไฟดับทั้งแถวฝั่งหน้าต่าง',
    ],
    progress: ['ตรวจสอบพบบัลลาสต์เสีย กำลังเปลี่ยน', 'กำลังไล่ตรวจวงจรไฟแสงสว่าง'],
    fixes: [
      'เปลี่ยนหลอด LED T8 18W จำนวน 3 หลอด',
      'เปลี่ยนบัลลาสต์และหลอดใหม่ ไฟไม่กะพริบแล้ว',
      'เปลี่ยนเบรกเกอร์ย่อย 16A ที่ทริป ไฟติดครบทั้งแถว',
    ],
    holds: ['รอหลอด LED จากงานพัสดุ'],
  },
  {
    category: 'ไฟฟ้า / แสงสว่าง',
    equipment: 'ปลั๊กไฟผนัง',
    scene: 'socket',
    kinds: ['classroom', 'complab', 'office', 'teacherroom', 'lab'],
    weight: 6,
    priority: [
      ['MEDIUM', 3],
      ['HIGH', 4],
      ['URGENT', 2],
    ],
    descriptions: [
      'เสียบปลั๊กแล้วไม่มีไฟ มีรอยไหม้ดำที่เต้ารับ มีกลิ่นไหม้',
      'ปลั๊กหลวม เสียบแล้วหลุด ชาร์จโน้ตบุ๊กไม่ได้',
      'มีประกายไฟตอนเสียบปลั๊ก',
    ],
    progress: ['ตัดไฟวงจรนี้ไว้ก่อนแล้ว กำลังเปลี่ยนเต้ารับ'],
    fixes: [
      'เปลี่ยนเต้ารับคู่ใหม่และขันสายให้แน่น ตรวจวัดสายดินผ่าน',
      'เปลี่ยนเต้ารับและสายไฟช่วงที่ไหม้ยาว 2 เมตร',
    ],
    holds: ['รอเต้ารับชนิดมีม่านนิรภัยจากงานพัสดุ'],
  },
  {
    category: 'ไฟฟ้า / แสงสว่าง',
    equipment: 'สวิตช์ไฟ',
    scene: 'switch',
    kinds: ['classroom', 'office', 'teacherroom', 'toilet', 'corridor'],
    weight: 3,
    priority: [
      ['LOW', 4],
      ['MEDIUM', 3],
    ],
    descriptions: ['กดสวิตช์แล้วไฟไม่ติด', 'สวิตช์แตก กดแล้วค้าง'],
    progress: ['กำลังเปลี่ยนสวิตช์'],
    fixes: ['เปลี่ยนสวิตช์ทางเดียว 2 ช่องใหม่ ใช้งานได้ปกติ'],
    holds: [],
  },
  {
    category: 'ประปา / สุขภัณฑ์',
    equipment: 'ก๊อกน้ำอ่างล้างมือ',
    scene: 'faucet',
    kinds: ['toilet', 'lab'],
    weight: 7,
    priority: [
      ['LOW', 3],
      ['MEDIUM', 5],
      ['HIGH', 1],
    ],
    descriptions: [
      'ก๊อกปิดไม่สนิท น้ำหยดตลอดเวลา',
      'ก๊อกน้ำหลวม หมุนแล้วฟรี น้ำไม่ไหล',
      'ใต้อ่างมีน้ำซึมออกมาตลอด',
    ],
    progress: ['ปิดวาล์วน้ำไว้ก่อนแล้ว กำลังเปลี่ยนอะไหล่'],
    fixes: ['เปลี่ยนวาล์วก๊อกน้ำใหม่ ทดสอบแล้วไม่มีน้ำรั่ว', 'เปลี่ยนสายน้ำดีและพันเทปเกลียวใหม่ใต้อ่าง'],
    holds: ['รอก๊อกน้ำรุ่นเดิมจากผู้จำหน่าย'],
  },
  {
    category: 'ประปา / สุขภัณฑ์',
    equipment: 'ชักโครก',
    scene: 'toilet',
    kinds: ['toilet'],
    weight: 5,
    priority: [
      ['MEDIUM', 5],
      ['HIGH', 3],
    ],
    descriptions: ['กดชักโครกแล้วน้ำไม่ลง', 'น้ำไหลลงโถตลอดเวลาไม่หยุด', 'ชักโครกตัน น้ำเอ่อจะล้น'],
    progress: ['กำลังทะลวงท่อโถส้วม'],
    fixes: ['เปลี่ยนชุดลูกลอยและวาล์วน้ำเข้าใหม่', 'ทะลวงท่อโถส้วมที่อุดตันด้วยงูเหล็ก ใช้งานได้ปกติ'],
    holds: ['รอชุดฟลัชวาล์วจากงานพัสดุ'],
  },
  {
    category: 'ประปา / สุขภัณฑ์',
    equipment: 'ท่อระบายน้ำพื้น',
    scene: 'drain',
    kinds: ['toilet'],
    weight: 3,
    priority: [
      ['MEDIUM', 4],
      ['HIGH', 3],
    ],
    descriptions: ['น้ำระบายช้ามาก เอ่อขังพื้นห้องน้ำ มีกลิ่นเหม็น', 'ท่อระบายน้ำตัน น้ำล้นออกมาถึงทางเดิน'],
    progress: ['กำลังล้างท่อระบายน้ำ'],
    fixes: ['ล้างท่อระบายน้ำ เก็บเศษขยะ และติดตั้งตะแกรงดักกลิ่นใหม่', 'ทะลวงท่อด้วยเครื่อง น้ำระบายได้ปกติ'],
    holds: [],
  },
  {
    category: 'คอมพิวเตอร์ / เครือข่าย',
    equipment: 'คอมพิวเตอร์ประจำห้อง',
    scene: 'monitor',
    kinds: ['classroom', 'complab', 'office', 'teacherroom'],
    asset: '7440-001',
    weight: 8,
    priority: [
      ['MEDIUM', 5],
      ['HIGH', 4],
      ['URGENT', 1],
    ],
    descriptions: [
      'เปิดเครื่องไม่ติด ไฟไม่เข้าเลย',
      'จอฟ้าขึ้นข้อความ error หลังเปิดเครื่อง',
      'เครื่องช้ามาก ค้างบ่อยระหว่างสอน',
      'จอไม่มีสัญญาณภาพ',
    ],
    progress: ['นำเครื่องมาตรวจที่ห้องช่างแล้ว', 'กำลังสำรองข้อมูลก่อนติดตั้งระบบใหม่'],
    fixes: [
      'เปลี่ยน Power Supply 450W ใหม่ เปิดใช้งานได้ปกติ',
      'เปลี่ยน SSD 256GB และติดตั้ง Windows ใหม่พร้อมโปรแกรมที่ใช้สอน',
      'เปลี่ยนสาย HDMI และอัปเดตไดรเวอร์การ์ดจอ',
    ],
    holds: ['รอ SSD จากงานพัสดุ', 'ส่งเครื่องเคลมประกันกับผู้จำหน่าย'],
  },
  {
    category: 'คอมพิวเตอร์ / เครือข่าย',
    equipment: 'จุดกระจายสัญญาณ Wi-Fi',
    scene: 'wifi',
    kinds: ['classroom', 'complab', 'meeting', 'office', 'teacherroom', 'corridor', 'server'],
    weight: 5,
    priority: [
      ['MEDIUM', 5],
      ['HIGH', 4],
    ],
    descriptions: [
      'เชื่อมต่อ Wi-Fi ได้แต่ใช้อินเทอร์เน็ตไม่ได้',
      'สัญญาณหลุดบ่อย ใช้งานไม่ได้ทั้งชั้น',
      'ไฟที่ตัวกระจายสัญญาณเป็นสีแดง',
    ],
    progress: ['ประสานผู้ดูแลเครือข่ายตรวจสอบแล้ว'],
    fixes: [
      'รีเซ็ตและอัปเดตเฟิร์มแวร์ Access Point ใช้งานได้ปกติ',
      'เปลี่ยน PoE Injector ที่เสีย สัญญาณกลับมาปกติ',
      'เปลี่ยนสาย LAN ช่วงที่ถูกหนูกัดขาด',
    ],
    holds: ['รอ Access Point ตัวใหม่จากงานเทคโนโลยีสารสนเทศ'],
  },
  {
    category: 'คอมพิวเตอร์ / เครือข่าย',
    equipment: 'เครื่องพิมพ์เลเซอร์',
    scene: 'printer',
    kinds: ['office', 'teacherroom'],
    asset: '7440-003',
    weight: 3,
    priority: [
      ['LOW', 3],
      ['MEDIUM', 4],
    ],
    descriptions: ['กระดาษติดบ่อย พิมพ์ได้ทีละ 2–3 แผ่น', 'พิมพ์ออกมาเป็นเส้นดำตลอดแผ่น'],
    progress: ['กำลังถอดทำความสะอาดชุดดึงกระดาษ'],
    fixes: [
      'ทำความสะอาดลูกยางดึงกระดาษและเปลี่ยนชุดดึงกระดาษใหม่',
      'เปลี่ยนตลับหมึกและลูกดรัมใหม่ งานพิมพ์คมชัด',
    ],
    holds: ['รอลูกดรัมจากผู้จำหน่าย'],
  },
  {
    category: 'โสตทัศนูปกรณ์',
    equipment: 'โปรเจคเตอร์',
    scene: 'projector',
    kinds: ['classroom', 'complab', 'meeting', 'lab'],
    asset: '7440-006',
    weight: 7,
    priority: [
      ['MEDIUM', 4],
      ['HIGH', 5],
      ['URGENT', 1],
    ],
    descriptions: [
      'เปิดแล้วภาพไม่ขึ้น ไฟสถานะกะพริบสีแดง',
      'ภาพมืดและเป็นสีเหลือง อ่านสไลด์ไม่ออก',
      'ต่อโน้ตบุ๊กแล้วขึ้น No Signal',
    ],
    progress: ['ตรวจสอบแล้ว หลอดหมดอายุ', 'กำลังตรวจสายสัญญาณในรางเดินสาย'],
    fixes: [
      'เปลี่ยนหลอดโปรเจคเตอร์ใหม่และรีเซ็ตชั่วโมงหลอด',
      'ทำความสะอาดฟิลเตอร์และเลนส์ ภาพสว่างคมชัด',
      'เปลี่ยนสาย HDMI ในรางเดินสายใหม่',
    ],
    holds: ['รอหลอดโปรเจคเตอร์จากผู้จำหน่าย 5–7 วัน'],
  },
  {
    category: 'โสตทัศนูปกรณ์',
    equipment: 'ไมโครโฟนไร้สาย',
    scene: 'mic',
    kinds: ['classroom', 'meeting'],
    weight: 3,
    priority: [
      ['MEDIUM', 5],
      ['HIGH', 2],
    ],
    descriptions: ['เสียงขาดเป็นช่วงๆ', 'เปิดไมค์แล้วไม่มีเสียงออกลำโพง'],
    progress: ['กำลังตรวจคลื่นความถี่ของเครื่องรับ'],
    fixes: ['จับคู่คลื่นความถี่ใหม่และเปลี่ยนถ่านชาร์จ', 'เปลี่ยนแคปซูลไมโครโฟน เสียงชัดปกติ'],
    holds: [],
  },
  {
    category: 'โสตทัศนูปกรณ์',
    equipment: 'ลำโพงติดผนัง',
    scene: 'speaker',
    kinds: ['classroom', 'meeting'],
    weight: 2,
    priority: [
      ['LOW', 3],
      ['MEDIUM', 4],
    ],
    descriptions: ['มีเสียงจี่ตลอดเวลา', 'ลำโพงข้างขวาไม่มีเสียง'],
    progress: ['กำลังตรวจสายสัญญาณ'],
    fixes: ['เปลี่ยนดอกลำโพงที่ขาดและเปลี่ยนสายสัญญาณ'],
    holds: ['รอดอกลำโพงจากผู้จำหน่าย'],
  },
  {
    category: 'เฟอร์นิเจอร์',
    equipment: 'เก้าอี้เลคเชอร์',
    scene: 'chair',
    kinds: ['classroom'],
    weight: 5,
    priority: [
      ['LOW', 5],
      ['MEDIUM', 3],
    ],
    descriptions: ['ขาเก้าอี้หัก นั่งไม่ได้ 4 ตัว', 'แผ่นรองเขียนหลุด 3 ตัว', 'เก้าอี้โยกเอียง น็อตหลุด'],
    progress: ['ขนเก้าอี้มาซ่อมที่ห้องช่างแล้ว'],
    fixes: ['เชื่อมขาเก้าอี้และเปลี่ยนน็อตใหม่ 4 ตัว', 'เปลี่ยนแผ่นรองเขียนใหม่ 3 ชุด'],
    holds: ['รอแผ่นรองเขียนจากงานพัสดุ'],
  },
  {
    category: 'เฟอร์นิเจอร์',
    equipment: 'ประตูห้อง / ลูกบิด',
    scene: 'door',
    kinds: ['classroom', 'complab', 'office', 'teacherroom', 'toilet', 'meeting', 'lab'],
    weight: 6,
    priority: [
      ['MEDIUM', 4],
      ['HIGH', 3],
    ],
    descriptions: [
      'ลูกบิดประตูหลวม ล็อกไม่ได้',
      'ประตูปิดไม่สนิท บานพับหลุด',
      'กุญแจหักคารูกุญแจ เข้าห้องไม่ได้',
    ],
    progress: ['กำลังถอดชุดลูกบิดเดิม'],
    fixes: [
      'เปลี่ยนลูกบิดประตูใหม่พร้อมกุญแจ 3 ดอก',
      'ขันบานพับและเปลี่ยนสกรูใหม่ ประตูปิดสนิท',
      'ถอดไส้กุญแจที่หักและเปลี่ยนไส้กุญแจใหม่',
    ],
    holds: [],
  },
  {
    category: 'อาคาร / โครงสร้าง',
    equipment: 'ฝ้าเพดาน',
    scene: 'ceiling',
    kinds: ['classroom', 'office', 'teacherroom', 'corridor'],
    weight: 4,
    priority: [
      ['MEDIUM', 4],
      ['HIGH', 3],
    ],
    descriptions: ['ฝ้ามีรอยรั่วซึม น้ำหยดเวลาฝนตก', 'ฝ้าเพดานยุบตัวเป็นคราบน้ำ เกรงว่าจะหล่นลงมา'],
    progress: ['ขึ้นตรวจเหนือฝ้าแล้ว พบรอยรั่วที่รางน้ำ'],
    fixes: [
      'ซ่อมรอยรั่วรางน้ำบนหลังคาและเปลี่ยนแผ่นฝ้ายิปซัม 2 แผ่น',
      'อุดรอยรั่วท่อน้ำทิ้งแอร์เหนือฝ้าและเปลี่ยนฝ้าแผ่นใหม่',
    ],
    holds: ['รอผู้รับเหมาซ่อมหลังคา (ต้องรอฝนหยุด)'],
  },
  {
    category: 'อาคาร / โครงสร้าง',
    equipment: 'กระเบื้องพื้น',
    scene: 'floor',
    kinds: ['corridor', 'classroom', 'toilet'],
    weight: 3,
    priority: [
      ['MEDIUM', 5],
      ['HIGH', 2],
    ],
    descriptions: ['กระเบื้องแตกยกตัว เสี่ยงสะดุดล้ม', 'กระเบื้องร่อนเป็นโพรง เดินแล้วมีเสียง'],
    progress: ['กั้นพื้นที่ไว้แล้ว กำลังสกัดกระเบื้องเดิม'],
    fixes: ['สกัดและปูกระเบื้องใหม่ 6 แผ่น พร้อมยาแนว'],
    holds: ['รอกระเบื้องสีเดิมจากผู้จำหน่าย'],
  },
  {
    category: 'อื่นๆ',
    equipment: 'ป้ายบอกทาง',
    scene: 'sign',
    kinds: ['corridor'],
    weight: 2,
    priority: [
      ['LOW', 4],
      ['MEDIUM', 3],
    ],
    descriptions: ['ป้ายบอกทางหลุดห้อยลงมา เสี่ยงตกใส่คน', 'ป้ายทางหนีไฟเอียงจนอ่านไม่ได้'],
    progress: ['กำลังติดตั้งป้ายใหม่'],
    fixes: ['ติดตั้งป้ายใหม่ด้วยพุกและสกรู 4 จุด'],
    holds: [],
  },
  {
    category: 'อื่นๆ',
    equipment: 'ลิฟต์โดยสาร',
    scene: 'elevator',
    kinds: ['corridor'],
    where: /ลิฟต์/,
    weight: 3,
    priority: [
      ['HIGH', 5],
      ['URGENT', 3],
    ],
    descriptions: ['ลิฟต์ค้างระหว่างชั้น ประตูไม่เปิด', 'ประตูลิฟต์เปิด-ปิดกระตุก มีเสียงดัง'],
    progress: ['แจ้งบริษัทผู้ดูแลลิฟต์เข้าตรวจสอบแล้ว'],
    fixes: [
      'ช่างบริษัทผู้ดูแลลิฟต์ปรับตั้งเซนเซอร์ประตูและเปลี่ยนลูกล้อประตู',
      'รีเซ็ตระบบควบคุมและทดสอบการทำงานครบทุกชั้น',
    ],
    holds: ['รอช่างบริษัทผู้ดูแลลิฟต์เข้าหน้างาน'],
  },
];

const REJECT_REASONS = [
  'อยู่นอกความรับผิดชอบของงานอาคาร ส่งเรื่องต่องานเทคโนโลยีสารสนเทศแล้ว',
  'อุปกรณ์หมดอายุการใช้งาน ต้องจัดซื้อทดแทน ส่งเรื่องให้งานพัสดุแล้ว',
  'อยู่ในระยะประกันของผู้รับเหมา แจ้งผู้รับเหมาเข้าดำเนินการแล้ว',
];
const CANCEL_REASONS = [
  'แจ้งซ้ำกับใบแจ้งซ่อมเดิม',
  'อุปกรณ์กลับมาใช้งานได้แล้ว',
  'ย้ายการเรียนการสอนไปห้องอื่นแล้ว',
];
// {q} / {s}: คำลงท้ายตามผู้พูด (คะ/ค่ะ หรือ ครับ)
const QUESTIONS = [
  'ช่างจะเข้ามาประมาณกี่โมง{q} พอดีมีสอนช่วงบ่าย',
  'รบกวนด่วนนะ{q} ห้องนี้มีสอบพรุ่งนี้',
  'ตอนนี้อาการหนักขึ้นกว่าเดิม{s}',
  'สะดวกเข้ามาช่วงเช้าไหม{q} ช่วงบ่ายห้องมีคนใช้',
];
const ANSWERS = [
  'จะเข้าไปดูหลังเที่ยงครับ รบกวนเปิดห้องไว้ให้ด้วยนะครับ',
  'รับทราบครับ จะเร่งดำเนินการให้ก่อนครับ',
  'สั่งอะไหล่แล้ว คาดว่าจะได้รับภายในสัปดาห์นี้ครับ',
  'พรุ่งนี้เช้า 9 โมงสะดวกไหมครับ',
];
const THANKS = ['ขอบคุณมาก{s}', 'ขอบคุณ{s} ใช้งานได้แล้ว', 'รับทราบ{s}'];
const FEEDBACK: Record<number, string[]> = {
  5: [
    'ช่างมาไวมาก บริการดีเยี่ยม',
    'ซ่อมเรียบร้อย ทำความสะอาดให้ด้วย ประทับใจ{s}',
    'รวดเร็วทันใจ ขอบคุณ{s}',
    '',
  ],
  4: ['ซ่อมเรียบร้อยดี{s}', 'โดยรวมดี รอนิดหน่อย', 'ใช้งานได้ปกติแล้ว{s}', ''],
  3: ['ใช้เวลานานกว่าที่คิด', 'ซ่อมได้แต่ต้องตามหลายครั้ง', ''],
  2: ['รอนานมาก ห้องร้อนหลายวัน', 'ซ่อมแล้วยังมีอาการอยู่บ้าง'],
  1: ['ยังใช้งานไม่ได้เหมือนเดิม'],
};

// ---------- คน -------------------------------------------------------------------

type Person = { key: string; name: string; coreRole: 'staff' | 'student'; workUnit?: string; phone?: string };
type Technician = Person & { skills: CategoryName[] };

const TECHNICIANS: Technician[] = [
  {
    key: 'prasert.k',
    name: 'นายประเสริฐ คงมั่น',
    coreRole: 'staff',
    workUnit: 'งานอาคารสถานที่ (ไฟฟ้า)',
    phone: '053000211',
    skills: ['ไฟฟ้า / แสงสว่าง', 'อื่นๆ'],
  },
  {
    key: 'amnat.s',
    name: 'นายอำนาจ ศรีเมือง',
    coreRole: 'staff',
    workUnit: 'งานอาคารสถานที่ (เครื่องปรับอากาศ)',
    phone: '053000212',
    skills: ['เครื่องปรับอากาศ'],
  },
  {
    key: 'surachai.t',
    name: 'นายสุรชัย ทองคำ',
    coreRole: 'staff',
    workUnit: 'งานอาคารสถานที่ (ประปา)',
    phone: '053000213',
    skills: ['ประปา / สุขภัณฑ์', 'อาคาร / โครงสร้าง'],
  },
  {
    key: 'nattapon.w',
    name: 'นายณัฐพล วงศ์ไชย',
    coreRole: 'staff',
    workUnit: 'งานเทคโนโลยีสารสนเทศ',
    phone: '053000214',
    skills: ['คอมพิวเตอร์ / เครือข่าย', 'โสตทัศนูปกรณ์'],
  },
  {
    key: 'boonmee.k',
    name: 'นายบุญมี แก้วกาศ',
    coreRole: 'staff',
    workUnit: 'งานอาคารสถานที่ (ช่างไม้)',
    phone: '053000215',
    skills: ['เฟอร์นิเจอร์', 'อาคาร / โครงสร้าง', 'อื่นๆ'],
  },
];

const TEACHERS: Person[] = [
  {
    key: 'wanna.s',
    name: 'ผศ.ดร.วรรณา ศรีสุข',
    coreRole: 'staff',
    workUnit: 'ห้องพักอาจารย์ 201',
    phone: '053000301',
  },
  { key: 'kittipong.s', name: 'อ.กิตติพงษ์ แสงทอง', coreRole: 'staff', workUnit: 'ห้องพักอาจารย์ 204' },
  {
    key: 'supaporn.w',
    name: 'รศ.ดร.สุภาพร วงศ์ใหญ่',
    coreRole: 'staff',
    workUnit: 'ห้องพักอาจารย์ 302',
    phone: '053000302',
  },
  { key: 'teerawat.b', name: 'อ.ธีรวัฒน์ บุญมา', coreRole: 'staff', workUnit: 'ห้องพักอาจารย์ 305' },
  { key: 'piyanuch.k', name: 'ดร.ปิยะนุช คำแสน', coreRole: 'staff', workUnit: 'ห้องพักอาจารย์ 307' },
  { key: 'chaiwat.i', name: 'อ.ชัยวัฒน์ อินทรวงศ์', coreRole: 'staff', workUnit: 'ห้องพักอาจารย์ 403' },
  {
    key: 'nantana.m',
    name: 'ผศ.นันทนา มณีวงศ์',
    coreRole: 'staff',
    workUnit: 'ห้องพักอาจารย์ 406',
    phone: '053000303',
  },
  { key: 'supachai.t', name: 'อ.ศุภชัย ทองประเสริฐ', coreRole: 'staff', workUnit: 'ห้องพักอาจารย์ 408' },
];

const STAFF: Person[] = [
  {
    key: 'pimchanok.j',
    name: 'นางสาวพิมพ์ชนก ใจดี',
    coreRole: 'staff',
    workUnit: 'สำนักงานสาขาวิชา CS105',
    phone: '053000401',
  },
  { key: 'somsak.m', name: 'นายสมศักดิ์ มีสุข', coreRole: 'staff', workUnit: 'งานพัสดุ', phone: '053000402' },
  {
    key: 'rattana.p',
    name: 'นางรัตนา พรหมมา',
    coreRole: 'staff',
    workUnit: 'งานบริหารทั่วไป',
    phone: '053000403',
  },
  {
    key: 'kamonwan.t',
    name: 'นางสาวกมลวรรณ ทองดี',
    coreRole: 'staff',
    workUnit: 'งานบริการการศึกษา',
    phone: '053000404',
  },
  {
    key: 'anucha.d',
    name: 'นายอนุชา ดวงดี',
    coreRole: 'staff',
    workUnit: 'ห้องเครือข่ายและเซิร์ฟเวอร์ CS104',
  },
  {
    key: 'siriporn.k',
    name: 'นางสาวศิริพร คำมา',
    coreRole: 'staff',
    workUnit: 'ห้องปฏิบัติการวิทยาศาสตร์',
    phone: '053000405',
  },
];

const STUDENTS: Person[] = [
  ['นายภูมิพัฒน์ สุขสวัสดิ์', '6504101201', '0890000101'],
  ['นางสาวชนิดา ปัญญาดี', '6604101318', undefined],
  ['นายธนกฤต วงศ์ษา', '6504101422', '0890000103'],
  ['นางสาวอรอุมา ศรีวิชัย', '6704101107', undefined],
  ['นายศุภกร จันทร์แก้ว', '6604101256', undefined],
  ['นางสาวณัฐธิดา บุญเรือง', '6704101333', '0890000106'],
  ['นายกฤษดา ใจมั่น', '6504101190', undefined],
  ['นางสาวปาริชาติ คำภีระ', '6604101274', undefined],
  ['นายวรเมธ อินต๊ะ', '6704101412', '0890000109'],
  ['นางสาวสุดารัตน์ ยอดคำ', '6504101365', undefined],
].map(([name, id, phone]) => ({
  key: id as string,
  name: name as string,
  coreRole: 'student' as const,
  phone,
}));

/** ใครมักแจ้งปัญหาที่สถานที่แต่ละแบบ */
const REPORTERS: Record<SpotKind, [Person[], number][]> = {
  classroom: [
    [TEACHERS, 6],
    [STUDENTS, 3],
    [STAFF, 1],
  ],
  complab: [
    [TEACHERS, 5],
    [STUDENTS, 4],
    [STAFF, 1],
  ],
  lab: [
    [TEACHERS, 6],
    [STAFF.filter((p) => p.workUnit?.includes('วิทยาศาสตร์')), 2],
    [STUDENTS, 2],
  ],
  server: [
    [STAFF.filter((p) => p.workUnit?.includes('เซิร์ฟเวอร์')), 8],
    [TEACHERS, 2],
  ],
  meeting: [
    [STAFF, 6],
    [TEACHERS, 4],
  ],
  office: [
    [STAFF, 9],
    [TEACHERS, 1],
  ],
  teacherroom: [
    [TEACHERS, 9],
    [STAFF, 1],
  ],
  toilet: [
    [STUDENTS, 4],
    [STAFF, 3],
    [TEACHERS, 3],
  ],
  corridor: [
    [STAFF, 5],
    [TEACHERS, 3],
    [STUDENTS, 2],
  ],
};

const MALE_FIRST_NAMES = ['กิตติพงษ์', 'ธีรวัฒน์', 'ชัยวัฒน์', 'ศุภชัย'];
/** เติม {q} / {s} ด้วยคำลงท้ายที่คนชื่อนี้ใช้ */
function politely(text: string, name: string) {
  const male = name.startsWith('นาย') || MALE_FIRST_NAMES.some((n) => name.includes(n));
  return text.replaceAll('{q}', male ? 'ครับ' : 'คะ').replaceAll('{s}', male ? 'ครับ' : 'ค่ะ');
}
const coreUserIdOf = (person: Person) => `${DEMO}${person.key}`;

// ---------- เวลา --------------------------------------------------------------

function bangkokDayStart(ms: number) {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date(ms));
  return new Date(`${day}T00:00:00+07:00`).getTime();
}

/** เวลาแจ้งตามเวลาไทย: ส่วนใหญ่อยู่ในเวลาราชการ */
function reportTime(dayStart: number) {
  const hour = chance(0.08) ? between(17.5, 20.5) : between(8, 16.8);
  return dayStart + hour * HOUR;
}

/** ช่างทำงาน 08:00–17:00 วันธรรมดา — นอกเวลารอเช้าวันทำการถัดไป (งานด่วน/ด่วนมากมีเวรรับทันที) */
function workingTime(ms: number, onCall: boolean) {
  if (onCall) return ms;
  const local = new Date(ms + 7 * HOUR);
  const hour = local.getUTCHours() + local.getUTCMinutes() / 60;
  const weekend = (d: number) => [0, 6].includes(new Date(d + 7 * HOUR).getUTCDay());
  if (!weekend(ms) && hour >= 8 && hour < 17) return ms;
  let next = bangkokDayStart(ms) + 8 * HOUR + between(0.1, 0.8) * HOUR;
  if (hour >= 8) next += DAY;
  while (weekend(next)) next += DAY;
  return next;
}

/** ชั่วโมงก่อนช่างรับเรื่องงานปกติ (งานด่วน/ด่วนมากคิดเป็นสัดส่วนของ SLA แทน) */
const WAIT_HOURS: Record<Priority, [number, number]> = {
  URGENT: [0.1, 0.5],
  HIGH: [0.3, 2],
  MEDIUM: [0.5, 8],
  LOW: [3, 30],
};

// ---------- รูป -----------------------------------------------------------------

type StoredPhoto = { filename: string; size: number };

/** คัดลอกรูปตัวอย่างไปเป็น "ไฟล์ที่อัปโหลด" ชื่อ UUID เหมือนที่ ImageStorage ตั้ง */
async function storePhoto(scene: Scene, stage: 'before' | 'after', variant: number): Promise<StoredPhoto> {
  const source = join(PHOTO_DIR, `${scene}-${stage}-${variant}.jpg`);
  const filename = `${randomUUID()}.jpg`;
  await copyFile(source, join(UPLOAD_DIR, filename));
  return { filename, size: (await stat(source)).size };
}

async function removePhotos(filenames: string[]) {
  await Promise.all(filenames.map((name) => unlink(join(UPLOAD_DIR, name)).catch(() => undefined)));
}

// ---------- ลบข้อมูลตัวอย่าง ----------------------------------------------------

async function clean() {
  const demoFilter = { startsWith: DEMO };
  const heldByDemo = await prisma.repairRequest.findMany({
    where: { assigneeCoreUserId: demoFilter, NOT: { coreUserId: demoFilter } },
    select: { code: true },
  });
  if (heldByDemo.length) {
    throw new Error(
      `ใบแจ้งซ่อมจริงต่อไปนี้มอบหมายให้ช่างตัวอย่างอยู่ กรุณาโอนให้ช่างจริงก่อนแล้วรันใหม่: ${heldByDemo
        .map((r) => r.code)
        .join(', ')}`,
    );
  }

  const requests = await prisma.repairRequest.findMany({
    where: { coreUserId: demoFilter },
    select: { id: true, images: { select: { filename: true } } },
  });
  const ids = requests.map((r) => r.id);
  await removePhotos(requests.flatMap((r) => r.images.map((image) => image.filename)));
  const notifications = await prisma.notification.deleteMany({
    where: { link: { in: ids.map((id) => `/requests/${id}`) } },
  });
  await prisma.repairRequest.deleteMany({ where: { id: { in: ids } } }); // activities และ images ลบตาม (cascade)
  const tags = await prisma.qrTag.deleteMany({ where: { code: { startsWith: QR_PREFIX } } });
  const profiles = await prisma.profile.deleteMany({ where: { coreUserId: demoFilter } });
  console.log(
    `ลบใบแจ้งซ่อมตัวอย่าง ${ids.length} ใบ · โปรไฟล์ตัวอย่าง ${profiles.count} คน · สติกเกอร์ QR ${tags.count} ชิ้น · การแจ้งเตือน ${notifications.count} รายการ`,
  );
}

// ---------- สร้างข้อมูล -----------------------------------------------------------

type Spot = {
  buildingId: string;
  buildingName: string;
  floor: number;
  location: string;
  kind: SpotKind;
  weight: number;
};
type Actor = { coreUserId: string; name: string };
type PlannedEvent = {
  at: number;
  type: ActivityType;
  from?: RequestStatus;
  to?: RequestStatus;
  message?: string;
  actor: Actor;
  /** เปลี่ยนความเร่งด่วนเป็นค่านี้ (type = UPDATED) */
  priority?: Priority;
};
type PlannedPhoto = { kind: 'BEFORE' | 'AFTER'; at: number; by: string; variant: number };
type Plan = {
  problem: Problem;
  spot: Spot;
  reporter: Actor;
  technician: Actor;
  realTechnician: boolean;
  assignedByAdmin: Actor | null;
  priority: Priority;
  description: string;
  assetNumber: string | null;
  qrTagId: string | null;
  createdAt: number;
  events: PlannedEvent[];
  rating: number | null;
  feedback: string | null;
  photos: PlannedPhoto[];
};

function isLocalDatabase(url: string) {
  try {
    return ['localhost', '127.0.0.1', '[::1]', 'db', 'host.docker.internal'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function main() {
  if (process.argv.includes('--clean')) return clean();

  if (!isLocalDatabase(process.env.DATABASE_URL ?? '') && !process.argv.includes('--allow-remote')) {
    throw new Error(
      'DATABASE_URL ไม่ใช่ฐานข้อมูลในเครื่อง — ถ้าตั้งใจเพิ่มข้อมูลตัวอย่างจริงให้รันใหม่พร้อม --allow-remote',
    );
  }
  if (await prisma.profile.count({ where: { coreUserId: { startsWith: DEMO } } })) {
    console.log('มีข้อมูลตัวอย่างอยู่แล้ว — รันด้วย --clean ก่อนถ้าต้องการสร้างใหม่');
    return;
  }
  await mkdir(UPLOAD_DIR, { recursive: true });

  await seedCatalog(prisma);
  const buildings = new Map(
    (await prisma.building.findMany({ where: { name: { in: PLACES.map((p) => p.name) } } })).map((b) => [
      b.name,
      b,
    ]),
  );
  const categories = new Map((await prisma.category.findMany()).map((c) => [c.name, c.id]));
  const categoryId = (name: CategoryName) => {
    const id = categories.get(name);
    if (!id) throw new Error(`ไม่พบหมวดหมู่ "${name}" — รัน pnpm --filter backend db:seed ก่อน`);
    return id;
  };

  const now = Date.now();
  const nowCut = now - 5 * 60_000;

  // โปรไฟล์ตัวอย่าง
  const everyone = [...TECHNICIANS, ...TEACHERS, ...STAFF, ...STUDENTS];
  await prisma.profile.createMany({
    data: everyone.map((person) => {
      const joined = now - between(190, 400) * DAY;
      return {
        coreUserId: coreUserIdOf(person),
        email: `${person.key}${EMAIL_DOMAIN}`,
        coreRole: person.coreRole,
        displayName: person.name,
        phone: person.phone ?? null,
        workUnit: person.workUnit ?? null,
        isTechnician: TECHNICIANS.includes(person as Technician),
        createdAt: new Date(joined),
        updatedAt: new Date(joined),
      };
    }),
  });
  const actorOf = (person: Person): Actor => ({ coreUserId: coreUserIdOf(person), name: person.name });

  // บัญชีจริงที่เข้าระบบนี้แล้ว
  const realProfiles = await prisma.profile.findMany({
    where: { NOT: { coreUserId: { startsWith: DEMO } } },
  });
  const realTechnicians = realProfiles
    .filter((p) => p.isTechnician && p.coreRole === 'staff')
    .map((p) => ({ coreUserId: p.coreUserId, name: displayNameOf(p) }));
  const realAdmin = realProfiles
    .filter((p) => p.coreRole === 'admin')
    .map((p) => ({ coreUserId: p.coreUserId, name: displayNameOf(p) }))[0];

  // จุดแจ้งซ่อม
  const spots: Spot[] = [];
  for (const place of PLACES) {
    const building = buildings.get(place.name);
    if (!building) throw new Error(`ไม่พบอาคาร "${place.name}" — รัน pnpm --filter backend db:seed ก่อน`);
    for (let floor = 1; floor <= place.floors; floor++) {
      for (const group of place.spots) {
        const names = group.names(floor);
        for (const location of names) {
          spots.push({
            buildingId: building.id,
            buildingName: building.name,
            floor,
            location,
            kind: group.kind,
            weight: (place.weight * group.weight) / Math.max(1, names.length),
          });
        }
      }
    }
  }
  const spotsFor = (problem: Problem) =>
    spots.filter((s) => problem.kinds.includes(s.kind) && (!problem.where || problem.where.test(s.location)));
  const pickSpot = (candidates: Spot[]) => weighted(candidates.map((s) => [s, s.weight] as const));
  const assetFor = (problem: Problem, spot: Spot) => {
    if (!problem.asset) return null;
    const h = hash(`${spot.buildingName}|${spot.location}|${problem.equipment}`);
    return `${problem.asset}-${pad(100 + (h % 9800), 4)}/${60 + (h % 8)}`;
  };

  // จุดเสียซ้ำ: อาการเดิมกลับมาที่จุดเดิมหลายครั้ง
  const hot = Array.from({ length: 8 }, () => {
    const problem = weighted(PROBLEMS.filter((p) => p.scene !== 'sign').map((p) => [p, p.weight] as const));
    return { problem, spot: pickSpot(spotsFor(problem)) };
  });

  // สติกเกอร์ QR ที่อุปกรณ์ของจุดเสียซ้ำ + ห้องอื่นอีกเล็กน้อย
  const qrTags = new Map<string, { id: string; assetNumber: string | null }>();
  const qrCandidates = [
    ...hot,
    ...Array.from({ length: 6 }, () => {
      const problem = pick(PROBLEMS.filter((p) => p.asset));
      return { problem, spot: pickSpot(spotsFor(problem)) };
    }),
  ];
  const takenCodes = new Set(
    (await prisma.qrTag.findMany({ where: { code: { startsWith: QR_PREFIX } }, select: { code: true } })).map(
      (t) => t.code,
    ),
  );
  for (const { problem, spot } of qrCandidates) {
    const key = `${spot.buildingId}|${spot.location}|${problem.equipment}`;
    if (qrTags.has(key)) continue;
    let code: string;
    do {
      code = QR_PREFIX + Array.from({ length: 4 }, () => pick([...QR_ALPHABET])).join('');
    } while (takenCodes.has(code));
    takenCodes.add(code);
    const assetNumber = assetFor(problem, spot);
    const created = new Date(now - HISTORY_DAYS * DAY - between(1, 20) * DAY);
    const tag = await prisma.qrTag.create({
      data: {
        code,
        buildingId: spot.buildingId,
        floor: spot.floor,
        location: spot.location,
        equipment: problem.equipment,
        assetNumber,
        categoryId: categoryId(problem.category),
        createdAt: created,
        updatedAt: created,
      },
    });
    qrTags.set(key, { id: tag.id, assetNumber });
  }

  // วันที่แจ้ง: เดือนหลัง ๆ ใช้งานมากขึ้น วันหยุดน้อยลง
  const days: number[] = [];
  while (days.length < REQUEST_COUNT) {
    const daysAgo = HISTORY_DAYS * Math.pow(rand(), 1.35);
    const day = bangkokDayStart(now - daysAgo * DAY);
    const weekday = new Date(day + 7 * HOUR).getUTCDay();
    if ((weekday === 0 || weekday === 6) && chance(0.75)) continue;
    days.push(day);
  }
  // งานที่เพิ่งแจ้งในช่วง 3 วันล่าสุด — ให้คิวงานมีงานค้างเหมือนวันทำงานจริง
  for (let i = 0; i < RECENT_COUNT; i++) days.push(bangkokDayStart(now - Math.floor(rand() * 4) * DAY));
  days.sort((a, b) => a - b);

  const plans: Plan[] = [];
  const hotUses = new Map<(typeof hot)[number], number>();
  for (const day of days) {
    const hotCandidate = chance(0.12) ? pick(hot) : null;
    const hotPick = hotCandidate && (hotUses.get(hotCandidate) ?? 0) < 4 ? hotCandidate : null;
    if (hotPick) hotUses.set(hotPick, (hotUses.get(hotPick) ?? 0) + 1);
    const problem = hotPick?.problem ?? weighted(PROBLEMS.map((p) => [p, p.weight] as const));
    const spot = hotPick?.spot ?? pickSpot(spotsFor(problem));
    let createdAt = reportTime(day);
    if (createdAt > nowCut) createdAt = now - between(0.3, 3) * HOUR;

    const groups = REPORTERS[spot.kind].filter(([group]) => group.length > 0);
    const reporterPerson = pick(weighted(groups));
    const reporter = actorOf(reporterPerson);
    const initialPriority = weighted(problem.priority);
    const tag = qrTags.get(`${spot.buildingId}|${spot.location}|${problem.equipment}`);
    const viaQr = tag !== undefined && chance(0.6);
    const asset = assetFor(problem, spot);

    // ช่าง: ส่วนใหญ่เป็นผู้ชำนาญงานประเภทนั้น · บัญชีจริงเพิ่งเริ่มใช้ จึงร่วมเฉพาะ 2 เดือนหลัง
    const specialists = TECHNICIANS.filter((t) => t.skills.includes(problem.category));
    const recent = createdAt > now - 60 * DAY;
    const realTechnician = recent && realTechnicians.length > 0 && chance(0.3);
    const technician = realTechnician
      ? pick(realTechnicians)
      : actorOf(chance(0.8) && specialists.length ? pick(specialists) : pick(TECHNICIANS));

    let priority = initialPriority;
    const sla = () => SLA_HOURS[priority] * HOUR;
    const onCall = () => priority === 'URGENT' || priority === 'HIGH';
    const work = (ms: number) => workingTime(ms, onCall());
    const step = (slaShare: [number, number], hours: [number, number]) =>
      onCall() ? sla() * between(...slaShare) : between(...hours) * HOUR;

    const events: PlannedEvent[] = [{ at: createdAt, type: 'CREATED', to: 'PENDING', actor: reporter }];
    const outcome = weighted([
      ['done', 86],
      ['rejected', 4],
      ['cancelled', 6],
      ['stuck', 4],
    ] as const);
    let t = createdAt;
    let assignedByAdmin: Actor | null = null;
    let rating: number | null = null;
    let feedback: string | null = null;
    const afterPhotos: number[] = [];

    if (outcome === 'cancelled') {
      t += between(0.5, 20) * HOUR;
      events.push({
        at: t,
        type: 'STATUS_CHANGED',
        from: 'PENDING',
        to: 'CANCELLED',
        message: pick(CANCEL_REASONS),
        actor: reporter,
      });
    } else {
      t = work(t + step([0.02, 0.1], WAIT_HOURS[priority]) + between(3, 15) * 60_000);
      if (realAdmin && recent && chance(0.25)) {
        assignedByAdmin = realAdmin;
        events.push({
          at: t,
          type: 'ASSIGNED',
          from: 'PENDING',
          to: 'ACCEPTED',
          message: `มอบหมายให้ ${technician.name}`,
          actor: realAdmin,
        });
      } else {
        events.push({ at: t, type: 'STATUS_CHANGED', from: 'PENDING', to: 'ACCEPTED', actor: technician });
      }
      const acceptedAt = t;
      // ช่างประเมินหน้างานแล้วปรับความเร่งด่วน
      if (chance(0.07)) {
        const order: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        const index = order.indexOf(priority);
        const next = order[Math.min(order.length - 1, Math.max(0, index + (chance(0.6) ? 1 : -1)))];
        if (next !== priority) {
          events.push({
            at: t + between(5, 40) * 60_000,
            type: 'UPDATED',
            message: `ความเร่งด่วน: ${PRIORITY_LABEL[priority]} → ${PRIORITY_LABEL[next]}`,
            actor: technician,
            priority: next,
          });
          priority = next;
        }
      }
      const conversation = chance(0.25);
      const talk = (end: number) => {
        if (!conversation || end - acceptedAt < 1.5 * HOUR) return;
        const ask = acceptedAt + (end - acceptedAt) * between(0.1, 0.45);
        events.push({
          at: ask,
          type: 'COMMENT',
          message: politely(pick(QUESTIONS), reporter.name),
          actor: reporter,
        });
        events.push({
          at: ask + Math.min(2 * HOUR, (end - ask) * 0.4),
          type: 'COMMENT',
          message: pick(ANSWERS),
          actor: technician,
        });
      };
      if (outcome === 'rejected') {
        t = work(t + between(1, 20) * HOUR);
        talk(t);
        events.push({
          at: t,
          type: 'STATUS_CHANGED',
          from: 'ACCEPTED',
          to: 'REJECTED',
          message: pick(REJECT_REASONS),
          actor: technician,
        });
      } else {
        t = work(t + step([0.02, 0.12], [0.2, 3]));
        events.push({
          at: t,
          type: 'STATUS_CHANGED',
          from: 'ACCEPTED',
          to: 'IN_PROGRESS',
          message: chance(0.7) ? pick(problem.progress) : undefined,
          actor: technician,
        });
        if ((outcome === 'stuck' || chance(priority === 'URGENT' ? 0.03 : 0.1)) && problem.holds.length) {
          t = work(t + between(1, 8) * HOUR);
          events.push({
            at: t,
            type: 'STATUS_CHANGED',
            from: 'IN_PROGRESS',
            to: 'ON_HOLD',
            message: pick(problem.holds),
            actor: technician,
          });
          t = work(t + (outcome === 'stuck' ? between(7, 25) : between(0.5, 3)) * DAY);
          events.push({
            at: t,
            type: 'STATUS_CHANGED',
            from: 'ON_HOLD',
            to: 'IN_PROGRESS',
            message: 'ได้รับอะไหล่แล้ว กำลังดำเนินการต่อ',
            actor: technician,
          });
        }
        t = onCall()
          ? work(Math.max(t + sla() * between(0.05, 0.2), createdAt + sla() * lognormal(0.4)))
          : work(t + lognormal(priority === 'LOW' ? 8 : 3) * HOUR * (chance(0.15) ? between(6, 16) : 1)); // งานใหญ่ใช้หลายวัน
        talk(t);
        const photoCount = chance(0.55) ? (chance(0.8) ? 1 : 2) : 0;
        for (let i = 0; i < photoCount; i++) afterPhotos.push(t);
        events.push({
          at: t,
          type: 'STATUS_CHANGED',
          from: 'IN_PROGRESS',
          to: 'COMPLETED',
          message: pick(problem.fixes),
          actor: technician,
        });
        if (chance(0.72)) {
          const onTime = t - createdAt <= sla();
          rating = onTime
            ? weighted([
                [5, 55],
                [4, 35],
                [3, 8],
                [2, 2],
              ] as const)
            : weighted([
                [5, 18],
                [4, 40],
                [3, 28],
                [2, 11],
                [1, 3],
              ] as const);
          feedback = politely(pick(FEEDBACK[rating]), reporter.name) || null;
          events.push({
            at: t + between(0.5, 40) * HOUR,
            type: 'RATED',
            message: `ให้คะแนน ${rating}/5${feedback ? ` — ${feedback}` : ''}`,
            actor: reporter,
          });
          if (chance(0.3)) {
            events.push({
              at: t + between(0.3, 6) * HOUR,
              type: 'COMMENT',
              message: politely(pick(THANKS), reporter.name),
              actor: reporter,
            });
          }
        }
      }
    }

    const beforeCount = chance(0.6) ? 1 : 2;
    const firstVariant = chance(0.5) ? 1 : 2;
    plans.push({
      problem,
      spot,
      reporter,
      technician,
      realTechnician,
      assignedByAdmin,
      priority: initialPriority,
      description:
        pick(problem.descriptions) +
        (chance(0.25) ? politely(' รบกวนช่วยตรวจสอบให้ด้วย{s}', reporter.name) : ''),
      assetNumber: viaQr ? (tag?.assetNumber ?? null) : asset && chance(0.7) ? asset : null,
      qrTagId: viaQr ? (tag?.id ?? null) : null,
      createdAt,
      events: events.filter((e) => e.at <= nowCut).sort((a, b) => a.at - b.at),
      rating,
      feedback,
      photos: [
        ...Array.from({ length: beforeCount }, (_, i) => ({
          kind: 'BEFORE' as const,
          at: createdAt,
          by: reporter.coreUserId,
          variant: ((firstVariant + i - 1) % 2) + 1,
        })),
        ...afterPhotos.map((at, i) => ({
          kind: 'AFTER' as const,
          at,
          by: technician.coreUserId,
          variant: ((firstVariant + i) % 2) + 1,
        })),
      ],
    });
  }
  plans.sort((a, b) => a.createdAt - b.createdAt);

  // เลขที่ใบแจ้งซ่อม: ต่อจากเลขที่มีอยู่แล้วในแต่ละเดือน
  const nextSequence = new Map<string, number>();
  async function codeFor(createdAt: number) {
    const prefix = requestCodePrefix(new Date(createdAt));
    if (!nextSequence.has(prefix)) {
      const existing = await prisma.repairRequest.findMany({
        where: { code: { startsWith: prefix } },
        select: { code: true },
      });
      nextSequence.set(prefix, Math.max(0, ...existing.map((r) => Number(r.code.slice(prefix.length)))));
    }
    const sequence = (nextSequence.get(prefix) ?? 0) + 1;
    nextSequence.set(prefix, sequence);
    return formatRequestCode(prefix, sequence);
  }

  console.log(`กำลังสร้างใบแจ้งซ่อม ${plans.length} ใบ พร้อมรูป → ${UPLOAD_DIR}`);
  const notifications: {
    coreUserId: string;
    title: string;
    message: string;
    link: string;
    isRead: boolean;
    at: number;
  }[] = [];
  const lastSeen = new Map<string, number>();
  const counts: Record<string, number> = {};
  let photoTotal = 0;

  for (const plan of plans) {
    const code = await codeFor(plan.createdAt);
    const statusEvents = plan.events.filter((e) => e.to);
    const status = statusEvents[statusEvents.length - 1].to as RequestStatus;
    const accepted = plan.events.find((e) => e.to === 'ACCEPTED');
    const completed = plan.events.find((e) => e.to === 'COMPLETED');
    const rated = plan.events.find((e) => e.type === 'RATED');
    const update = plan.events.find((e) => e.type === 'UPDATED');
    const priority = update?.priority ?? plan.priority;
    const photos = plan.photos.filter((p) => p.kind === 'BEFORE' || status === 'COMPLETED');
    const stored = await Promise.all(
      photos.map((p) => storePhoto(plan.problem.scene, p.kind === 'BEFORE' ? 'before' : 'after', p.variant)),
    );
    photoTotal += stored.length;
    counts[status] = (counts[status] ?? 0) + 1;
    const lastAt = plan.events[plan.events.length - 1].at;

    let row: { id: string };
    try {
      row = await prisma.repairRequest.create({
        data: {
          code,
          equipment: plan.problem.equipment,
          assetNumber: plan.assetNumber,
          description: plan.description,
          floor: plan.spot.floor,
          location: plan.spot.location,
          priority,
          status,
          rating: status === 'COMPLETED' && rated ? plan.rating : null,
          feedback: status === 'COMPLETED' && rated ? plan.feedback : null,
          dueAt: new Date(plan.createdAt + SLA_HOURS[priority] * HOUR),
          acceptedAt: accepted ? new Date(accepted.at) : null,
          completedAt: status === 'COMPLETED' && completed ? new Date(completed.at) : null,
          coreUserId: plan.reporter.coreUserId,
          assigneeCoreUserId: accepted ? plan.technician.coreUserId : null,
          buildingId: plan.spot.buildingId,
          categoryId: categoryId(plan.problem.category),
          qrTagId: plan.qrTagId,
          createdAt: new Date(plan.createdAt),
          updatedAt: new Date(lastAt),
          activities: {
            create: plan.events.map((e) => ({
              type: e.type,
              fromStatus: e.from ?? null,
              toStatus: e.to ?? null,
              message: e.message ?? null,
              actorCoreUserId: e.actor.coreUserId,
              createdAt: new Date(e.at),
              updatedAt: new Date(e.at),
            })),
          },
          images: {
            create: photos.map((p, i) => ({
              filename: stored[i].filename,
              mimeType: 'image/jpeg',
              size: stored[i].size,
              kind: p.kind,
              uploaderCoreUserId: p.by,
              createdAt: new Date(p.at),
              updatedAt: new Date(p.at),
            })),
          },
        },
        select: { id: true },
      });
    } catch (error) {
      await removePhotos(stored.map((s) => s.filename));
      throw error;
    }
    for (const e of plan.events)
      lastSeen.set(e.actor.coreUserId, Math.max(lastSeen.get(e.actor.coreUserId) ?? 0, e.at));

    // การแจ้งเตือนที่บัญชีจริงจะได้รับ (ข้อความเดียวกับ RepairRequestsService)
    const link = `/requests/${row.id}`;
    const place = `${plan.spot.buildingName} ${plan.spot.location}`;
    if (plan.createdAt > now - 10 * DAY) {
      for (const tech of realTechnicians) {
        notifications.push({
          coreUserId: tech.coreUserId,
          title: `งานแจ้งซ่อมใหม่ ${code}`,
          message: `${plan.problem.equipment} · ${place} · ความเร่งด่วน: ${PRIORITY_LABEL[plan.priority]}`,
          link,
          isRead: plan.createdAt < now - DAY || status !== 'PENDING',
          at: plan.createdAt,
        });
      }
    }
    if (plan.realTechnician && accepted) {
      if (plan.assignedByAdmin) {
        notifications.push({
          coreUserId: plan.technician.coreUserId,
          title: `มีงานมอบหมายให้คุณ ${code}`,
          message: `${plan.problem.equipment} · ${place}`,
          link,
          isRead: accepted.at < now - DAY,
          at: accepted.at,
        });
      }
      for (const e of plan.events.filter((ev) => ev.type === 'COMMENT' && ev.actor === plan.reporter)) {
        notifications.push({
          coreUserId: plan.technician.coreUserId,
          title: `ความคิดเห็นใหม่ใน ${code}`,
          message: `${plan.reporter.name}: ${e.message}`,
          link,
          isRead: e.at < now - DAY,
          at: e.at,
        });
      }
      if (rated && plan.rating) {
        notifications.push({
          coreUserId: plan.technician.coreUserId,
          title: `ได้รับคะแนนความพึงพอใจ ${plan.rating}/5`,
          message: `งาน ${code} (${plan.problem.equipment})${plan.feedback ? ` — “${plan.feedback}”` : ''}`,
          link,
          isRead: rated.at < now - 2 * DAY,
          at: rated.at,
        });
      }
    }
  }

  if (notifications.length) {
    await prisma.notification.createMany({
      data: notifications.map(({ at, ...n }) => ({ ...n, createdAt: new Date(at), updatedAt: new Date(at) })),
    });
  }
  for (const person of everyone) {
    const seen = lastSeen.get(coreUserIdOf(person));
    if (seen)
      await prisma.profile.update({
        where: { coreUserId: coreUserIdOf(person) },
        data: { lastSeenAt: new Date(seen) },
      });
  }

  const summary = Object.entries(counts)
    .map(([status, n]) => `${status} ${n}`)
    .join(', ');
  console.log(`สร้างใบแจ้งซ่อม ${plans.length} ใบ (${summary})`);
  console.log(
    `รูป ${photoTotal} รูป · สติกเกอร์ QR ${qrTags.size} ชิ้น · โปรไฟล์ตัวอย่าง ${everyone.length} คน · การแจ้งเตือนของบัญชีจริง ${notifications.length} รายการ`,
  );
  if (!realTechnicians.length) {
    console.log(
      'หมายเหตุ: ยังไม่มีช่างที่เป็นบัญชีจริง — แต่งตั้งช่างในหน้า "ผู้ใช้และช่าง" แล้วรันใหม่หลัง --clean เพื่อให้มีงานของตัวเอง',
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
